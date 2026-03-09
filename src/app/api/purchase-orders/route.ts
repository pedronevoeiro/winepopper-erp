import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpPurchaseOrderStatus } from '@/types/database'

// GET /api/purchase-orders — list with enriched supplier + item count
export async function GET() {
  try {
    const supabase = db()

    const { data, error } = await supabase
      .from('erp_purchase_orders')
      .select('*, supplier:erp_contacts(name), items:erp_purchase_order_items(*, product:erp_products(name, sku))')

    if (error) {
      console.error('GET /api/purchase-orders error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const enriched = (data ?? []).map((po) => {
      const supplier = po.supplier as { name: string } | null
      const items = (po.items ?? []) as Array<Record<string, unknown> & { product: { name: string; sku: string | null } | null }>

      return {
        ...po,
        supplier: undefined,
        supplier_name: supplier?.name ?? 'Fornecedor desconhecido',
        item_count: items.length,
        items: items.map((item) => ({
          ...item,
          product_name: item.product?.name ?? 'Produto desconhecido',
          product_sku: item.product?.sku ?? null,
          product: undefined,
        })),
      }
    })

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
    })
  } catch (err) {
    console.error('GET /api/purchase-orders unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/purchase-orders — create new purchase order with items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    if (!body.supplier_id) {
      return NextResponse.json(
        { error: 'Fornecedor e obrigatorio.' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Adicione pelo menos um item ao pedido.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Get next order number
    const { data: maxRow } = await supabase
      .from('erp_purchase_orders')
      .select('order_number')
      .order('order_number', { ascending: false })
      .limit(1)
      .single()

    const orderNumber = (maxRow?.order_number ?? 0) + 1

    // Build items
    const itemInserts = body.items.map((item: {
      product_id: string
      variation_id?: string | null
      quantity: number
      unit_cost_estimated: number
    }) => ({
      purchase_order_id: '__PLACEHOLDER__',
      product_id: item.product_id,
      variation_id: item.variation_id ?? null,
      quantity: item.quantity,
      unit_cost_estimated: item.unit_cost_estimated,
      quantity_received: 0,
      total_estimated: item.quantity * item.unit_cost_estimated,
    }))

    const totalEstimated = itemInserts.reduce((sum: number, i: { total_estimated: number }) => sum + i.total_estimated, 0)

    // Insert order
    const { data: newOrder, error: orderErr } = await supabase
      .from('erp_purchase_orders')
      .insert({
        order_number: orderNumber,
        supplier_id: body.supplier_id,
        status: 'draft',
        expected_date: body.expected_date || null,
        total_estimated: totalEstimated,
        notes: body.notes || null,
        created_by: body.created_by || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (orderErr || !newOrder) {
      console.error('POST /api/purchase-orders insert error:', orderErr)
      return NextResponse.json({ error: orderErr?.message ?? 'Erro ao criar pedido.' }, { status: 500 })
    }

    // Insert items with real order_id
    const itemsWithId = itemInserts.map((item: Record<string, unknown>) => ({
      ...item,
      purchase_order_id: newOrder.id,
    }))

    const { data: items, error: itemsErr } = await supabase
      .from('erp_purchase_order_items')
      .insert(itemsWithId)
      .select()

    if (itemsErr) {
      console.error('POST /api/purchase-orders insert items error:', itemsErr)
    }

    return NextResponse.json({ data: { ...newOrder, items: items ?? [] } }, { status: 201 })
  } catch (err) {
    console.error('POST /api/purchase-orders unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}

// PATCH /api/purchase-orders — update order status, receive items
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    const { id, status, received_items } = body as {
      id: string
      status?: ErpPurchaseOrderStatus
      received_items?: { item_id: string; quantity_received: number }[]
    }

    // Fetch existing order
    const { data: order, error: fetchErr } = await supabase
      .from('erp_purchase_orders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json(
        { error: 'Pedido de compra nao encontrado.' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = { updated_at: now }

    // Update status
    if (status) {
      updatePayload.status = status
    }

    // Receive items — update quantity_received and stock
    if (Array.isArray(received_items)) {
      for (const ri of received_items) {
        // Fetch the item
        const { data: item } = await supabase
          .from('erp_purchase_order_items')
          .select('*')
          .eq('id', ri.item_id)
          .eq('purchase_order_id', id)
          .single()

        if (item) {
          const previousReceived = item.quantity_received
          const newReceived = Math.min(ri.quantity_received, item.quantity)

          await supabase
            .from('erp_purchase_order_items')
            .update({ quantity_received: newReceived })
            .eq('id', item.id)

          // Add to stock if receiving new quantities
          const delta = newReceived - previousReceived
          if (delta > 0) {
            let stockQuery = supabase
              .from('erp_stock')
              .select('*')
              .eq('product_id', item.product_id)

            if (item.variation_id) {
              stockQuery = stockQuery.eq('variation_id', item.variation_id)
            } else {
              stockQuery = stockQuery.is('variation_id', null)
            }

            const { data: stockEntries } = await stockQuery

            if (stockEntries && stockEntries.length > 0) {
              const stockEntry = stockEntries[0]
              await supabase
                .from('erp_stock')
                .update({ quantity: stockEntry.quantity + delta })
                .eq('id', stockEntry.id)

              // Record stock movement
              await supabase.from('erp_stock_movements').insert({
                product_id: item.product_id,
                variation_id: item.variation_id,
                warehouse_id: stockEntry.warehouse_id,
                type: 'purchase',
                quantity: delta,
                reference_type: 'purchase_order',
                reference_id: id,
                notes: `Recebimento PC #${order.order_number}`,
                created_by: null,
                created_at: now,
              })
            }
          }
        }
      }

      // Auto-determine status based on received items
      const { data: orderItems } = await supabase
        .from('erp_purchase_order_items')
        .select('quantity, quantity_received')
        .eq('purchase_order_id', id)

      const allReceived = (orderItems ?? []).every((i) => i.quantity_received >= i.quantity)
      const someReceived = (orderItems ?? []).some((i) => i.quantity_received > 0)

      if (allReceived) {
        updatePayload.status = 'received'
      } else if (someReceived && !status) {
        updatePayload.status = 'partial'
      }
    }

    // Update order
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('erp_purchase_orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      console.error('PATCH /api/purchase-orders update error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Fetch updated items
    const { data: items } = await supabase
      .from('erp_purchase_order_items')
      .select('*')
      .eq('purchase_order_id', id)

    return NextResponse.json({ data: { ...updatedOrder, items: items ?? [] } })
  } catch (err) {
    console.error('PATCH /api/purchase-orders unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}

// DELETE /api/purchase-orders — remove order and items (only draft/cancelled)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body as { id: string }

    const supabase = db()

    // Fetch order
    const { data: order, error: fetchErr } = await supabase
      .from('erp_purchase_orders')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json(
        { error: 'Pedido de compra nao encontrado.' },
        { status: 404 }
      )
    }

    if (order.status !== 'draft' && order.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Somente pedidos em rascunho ou cancelados podem ser excluidos.' },
        { status: 400 }
      )
    }

    // Remove items first
    await supabase
      .from('erp_purchase_order_items')
      .delete()
      .eq('purchase_order_id', id)

    // Remove order
    const { error: deleteErr } = await supabase
      .from('erp_purchase_orders')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      console.error('DELETE /api/purchase-orders error:', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/purchase-orders unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
