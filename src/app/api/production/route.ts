import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/production — delete a production order, reverse stock if completed
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'id e obrigatorio.' }, { status: 400 })
    }

    const supabase = db()

    // Fetch the order
    const { data: order, error: fetchErr } = await supabase
      .from('erp_production_orders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Ordem nao encontrada.' }, { status: 404 })
    }

    // If completed, reverse stock adjustments
    if (order.status === 'completed') {
      // Decrease product stock by quantity_produced
      const { data: productStockEntries } = await supabase
        .from('erp_stock')
        .select('*')
        .eq('product_id', order.product_id)
        .eq('warehouse_id', order.warehouse_id)
        .is('variation_id', null)

      if (productStockEntries && productStockEntries.length > 0) {
        const entry = productStockEntries[0]
        await supabase
          .from('erp_stock')
          .update({ quantity: Math.max(0, entry.quantity - order.quantity_produced) })
          .eq('id', entry.id)
      }

      // Restore component stock
      const { data: orderComponents } = await supabase
        .from('erp_production_components')
        .select('*')
        .eq('production_id', id)

      for (const comp of orderComponents ?? []) {
        const { data: compStockEntries } = await supabase
          .from('erp_stock')
          .select('*')
          .eq('product_id', comp.component_id)
          .eq('warehouse_id', order.warehouse_id)
          .is('variation_id', null)

        if (compStockEntries && compStockEntries.length > 0) {
          const entry = compStockEntries[0]
          await supabase
            .from('erp_stock')
            .update({ quantity: entry.quantity + comp.consumed_qty })
            .eq('id', entry.id)
        }
      }
    }

    // Remove associated components
    await supabase
      .from('erp_production_components')
      .delete()
      .eq('production_id', id)

    // Remove order
    const { error: deleteErr } = await supabase
      .from('erp_production_orders')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      console.error('DELETE /api/production error:', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/production unexpected error:', err)
    return NextResponse.json({ error: 'Erro ao processar.' }, { status: 500 })
  }
}

// GET /api/production — list production orders enriched with component names and worker names
export async function GET() {
  try {
    const supabase = db()

    // Fetch production orders with product info
    const { data: orders, error } = await supabase
      .from('erp_production_orders')
      .select('*, product:erp_products(name, sku)')
      .order('order_number', { ascending: false })

    if (error) {
      console.error('GET /api/production error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with components and workers
    const enriched = await Promise.all(
      (orders ?? []).map(async (order) => {
        const product = order.product as { name: string; sku: string | null } | null

        // Fetch components with product info
        const { data: components } = await supabase
          .from('erp_production_components')
          .select('*, component:erp_products(name, sku)')
          .eq('production_id', order.id)

        const enrichedComponents = (components ?? []).map((pc) => {
          const comp = pc.component as { name: string; sku: string | null } | null
          return {
            ...pc,
            component: undefined,
            component_name: comp?.name ?? 'Componente desconhecido',
            component_sku: comp?.sku ?? null,
          }
        })

        // Fetch worker info for assigned_workers
        const workerIds = order.assigned_workers as string[] ?? []
        let workers: Array<{ id: string; name: string; role: string | null }> = []

        if (workerIds.length > 0) {
          const { data: workerData } = await supabase
            .from('erp_production_workers')
            .select('id, name, role')
            .in('id', workerIds)

          workers = workerIds.map((workerId) => {
            const worker = (workerData ?? []).find((w) => w.id === workerId)
            return {
              id: workerId,
              name: worker?.name ?? 'Trabalhador desconhecido',
              role: worker?.role ?? null,
            }
          })
        }

        return {
          ...order,
          product: undefined,
          product_name: product?.name ?? 'Produto desconhecido',
          product_sku: product?.sku ?? '-',
          components: enrichedComponents,
          workers,
        }
      })
    )

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
    })
  } catch (err) {
    console.error('GET /api/production unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/production — create a production order with components and assigned workers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    const { product_id, quantity, notes, components, assigned_workers, planned_date } = body as {
      product_id: string
      quantity: number
      notes?: string
      components?: { component_id: string; required_qty: number; unit?: string }[]
      assigned_workers?: string[]
      planned_date?: string
    }

    // Validate required fields
    if (!product_id || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'product_id e quantity sao obrigatorios. quantity deve ser >= 1.' },
        { status: 400 }
      )
    }

    // Validate product exists
    const { data: product, error: productErr } = await supabase
      .from('erp_products')
      .select('name, sku')
      .eq('id', product_id)
      .single()

    if (productErr || !product) {
      return NextResponse.json(
        { error: 'Produto nao encontrado.' },
        { status: 404 }
      )
    }

    // Get next order number
    const { data: maxRow } = await supabase
      .from('erp_production_orders')
      .select('order_number')
      .order('order_number', { ascending: false })
      .limit(1)
      .single()

    const orderNumber = (maxRow?.order_number ?? 0) + 1

    // Get default warehouse
    const { data: warehouse } = await supabase
      .from('erp_warehouses')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    const now = new Date().toISOString()

    const { data: newOrder, error: orderErr } = await supabase
      .from('erp_production_orders')
      .insert({
        order_number: orderNumber,
        product_id,
        variation_id: null,
        quantity,
        quantity_produced: 0,
        quantity_lost: 0,
        warehouse_id: warehouse?.id ?? '',
        sales_order_id: null,
        assigned_workers: Array.isArray(assigned_workers) ? assigned_workers : [],
        status: 'pending',
        planned_date: planned_date || null,
        notes: notes || null,
        started_at: null,
        completed_at: null,
        created_by: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (orderErr || !newOrder) {
      console.error('POST /api/production insert error:', orderErr)
      return NextResponse.json({ error: orderErr?.message ?? 'Erro ao criar ordem.' }, { status: 500 })
    }

    // Create production components
    let createdComponents: Array<Record<string, unknown>> = []
    if (Array.isArray(components) && components.length > 0) {
      const compInserts = components.map((comp) => ({
        production_id: newOrder.id,
        component_id: comp.component_id,
        required_qty: comp.required_qty,
        consumed_qty: 0,
        unit: comp.unit || 'un',
      }))

      const { data: comps, error: compErr } = await supabase
        .from('erp_production_components')
        .insert(compInserts)
        .select()

      if (compErr) {
        console.error('POST /api/production insert components error:', compErr)
      }
      createdComponents = comps ?? []
    }

    return NextResponse.json({
      data: {
        ...newOrder,
        product_name: product.name,
        product_sku: product.sku,
        components: createdComponents,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/production unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro ao processar a requisicao.' },
      { status: 500 }
    )
  }
}

// PATCH /api/production — update production order status transitions
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    const { id, status, quantity_produced, quantity_lost, started_at, completed_at, quantity, assigned_workers, notes, planned_date } = body as {
      id: string
      status?: string
      quantity_produced?: number
      quantity_lost?: number
      started_at?: string
      completed_at?: string
      quantity?: number
      assigned_workers?: string[]
      notes?: string
      planned_date?: string
    }

    if (!id) {
      return NextResponse.json(
        { error: 'id e obrigatorio.' },
        { status: 400 }
      )
    }

    // Fetch existing order
    const { data: order, error: fetchErr } = await supabase
      .from('erp_production_orders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json(
        { error: 'Ordem de producao nao encontrada.' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = { updated_at: now }

    if (status) {
      // Status transition
      if (status === 'in_progress') {
        updatePayload.status = 'in_progress'
        updatePayload.started_at = started_at || now
      } else if (status === 'completed') {
        const produced = quantity_produced ?? order.quantity
        const lost = quantity_lost ?? 0

        updatePayload.status = 'completed'
        updatePayload.quantity_produced = produced
        updatePayload.quantity_lost = lost
        updatePayload.completed_at = completed_at || now

        // Update stock: increase product stock by quantity_produced
        const { data: productStockEntries } = await supabase
          .from('erp_stock')
          .select('*')
          .eq('product_id', order.product_id)
          .eq('warehouse_id', order.warehouse_id)
          .is('variation_id', null)

        if (productStockEntries && productStockEntries.length > 0) {
          const entry = productStockEntries[0]
          await supabase
            .from('erp_stock')
            .update({ quantity: entry.quantity + produced })
            .eq('id', entry.id)
        }

        // Decrease each component stock by consumed_qty
        const { data: orderComponents } = await supabase
          .from('erp_production_components')
          .select('*')
          .eq('production_id', id)

        for (const comp of orderComponents ?? []) {
          await supabase
            .from('erp_production_components')
            .update({ consumed_qty: comp.required_qty })
            .eq('id', comp.id)

          const { data: compStockEntries } = await supabase
            .from('erp_stock')
            .select('*')
            .eq('product_id', comp.component_id)
            .eq('warehouse_id', order.warehouse_id)
            .is('variation_id', null)

          if (compStockEntries && compStockEntries.length > 0) {
            const entry = compStockEntries[0]
            await supabase
              .from('erp_stock')
              .update({ quantity: Math.max(0, entry.quantity - comp.required_qty) })
              .eq('id', entry.id)
          }
        }
      } else if (status === 'cancelled') {
        updatePayload.status = 'cancelled'
      } else {
        return NextResponse.json(
          { error: 'Status invalido. Valores aceitos: in_progress, completed, cancelled.' },
          { status: 400 }
        )
      }
    } else {
      // General edit — no status change, no stock adjustments
      if (quantity !== undefined && quantity >= 1) updatePayload.quantity = quantity
      if (assigned_workers !== undefined) updatePayload.assigned_workers = assigned_workers
      if (notes !== undefined) updatePayload.notes = notes || null
      if (planned_date !== undefined) updatePayload.planned_date = planned_date || null
      if (started_at !== undefined) updatePayload.started_at = started_at || null
      if (completed_at !== undefined) updatePayload.completed_at = completed_at || null
      if (quantity_produced !== undefined) updatePayload.quantity_produced = quantity_produced
      if (quantity_lost !== undefined) updatePayload.quantity_lost = quantity_lost
    }

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('erp_production_orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      console.error('PATCH /api/production update error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Fetch product name for response
    const { data: product } = await supabase
      .from('erp_products')
      .select('name, sku')
      .eq('id', order.product_id)
      .single()

    return NextResponse.json({
      data: {
        ...updatedOrder,
        product_name: product?.name ?? 'Produto desconhecido',
        product_sku: product?.sku ?? '-',
      },
    })
  } catch (err) {
    console.error('PATCH /api/production unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro ao processar a requisicao.' },
      { status: 500 }
    )
  }
}
