import { NextRequest, NextResponse } from 'next/server'
import { productionOrders, productionComponents, productionWorkers, products, warehouses, stock } from '@/lib/data'
import type { ErpProductionOrder, ErpProductionComponent } from '@/types/database'

// GET /api/production — list production orders enriched with component names and worker names
export async function GET() {
  // Sort by order_number descending (newest first)
  const sorted = [...productionOrders].sort((a, b) => b.order_number - a.order_number)

  // Enrich with product name, component details, and worker details
  const enriched = sorted.map((order) => {
    const product = products.find((p) => p.id === order.product_id)

    // Enrich components for this order
    const components = productionComponents
      .filter((pc) => pc.production_id === order.id)
      .map((pc) => {
        const componentProduct = products.find((p) => p.id === pc.component_id)
        return {
          ...pc,
          component_name: componentProduct?.name ?? 'Componente desconhecido',
          component_sku: componentProduct?.sku ?? null,
        }
      })

    // Enrich workers for this order
    const workers = order.assigned_workers.map((workerId) => {
      const worker = productionWorkers.find((w) => w.id === workerId)
      return {
        id: workerId,
        name: worker?.name ?? 'Trabalhador desconhecido',
        role: worker?.role ?? null,
      }
    })

    return {
      ...order,
      product_name: product?.name ?? 'Produto desconhecido',
      product_sku: product?.sku ?? '-',
      components,
      workers,
    }
  })

  return NextResponse.json({
    data: enriched,
    count: enriched.length,
  })
}

// POST /api/production — create a production order with components and assigned workers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { product_id, quantity, notes, components, assigned_workers, planned_date } = body as {
      product_id: string
      quantity: number
      notes?: string
      components?: { component_id: string; required_qty: number }[]
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
    const product = products.find((p) => p.id === product_id)
    if (!product) {
      return NextResponse.json(
        { error: 'Produto nao encontrado.' },
        { status: 404 }
      )
    }

    // Get next order number
    const maxOrderNumber = productionOrders.reduce(
      (max, o) => Math.max(max, o.order_number),
      0
    )

    const now = new Date().toISOString()

    const newOrder: ErpProductionOrder = {
      id: crypto.randomUUID(),
      order_number: maxOrderNumber + 1,
      product_id,
      variation_id: null,
      quantity,
      quantity_produced: 0,
      quantity_lost: 0,
      warehouse_id: warehouses[0]?.id ?? '',
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
    }

    // Push order to in-memory array
    productionOrders.push(newOrder)

    // Create production components
    const createdComponents: ErpProductionComponent[] = []
    if (Array.isArray(components) && components.length > 0) {
      for (const comp of components) {
        const pc: ErpProductionComponent = {
          id: crypto.randomUUID(),
          production_id: newOrder.id,
          component_id: comp.component_id,
          required_qty: comp.required_qty,
          consumed_qty: 0,
        }
        productionComponents.push(pc)
        createdComponents.push(pc)
      }
    }

    return NextResponse.json({
      data: {
        ...newOrder,
        product_name: product.name,
        product_sku: product.sku,
        components: createdComponents,
      },
    }, { status: 201 })
  } catch {
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

    const orderIndex = productionOrders.findIndex((o) => o.id === id)
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: 'Ordem de producao nao encontrada.' },
        { status: 404 }
      )
    }

    const order = productionOrders[orderIndex]
    const now = new Date().toISOString()

    if (status) {
      // Status transition
      if (status === 'in_progress') {
        order.status = 'in_progress'
        order.started_at = started_at || now
        order.updated_at = now
      } else if (status === 'completed') {
        const produced = quantity_produced ?? order.quantity
        const lost = quantity_lost ?? 0

        order.status = 'completed'
        order.quantity_produced = produced
        order.quantity_lost = lost
        order.completed_at = completed_at || now
        order.updated_at = now

        // Update stock: increase product stock by quantity_produced
        const productStockEntry = stock.find(
          (s) => s.product_id === order.product_id && s.warehouse_id === order.warehouse_id && s.variation_id === null
        )
        if (productStockEntry) {
          productStockEntry.quantity += produced
        }

        // Decrease each component stock by consumed_qty
        const orderComponents = productionComponents.filter(
          (pc) => pc.production_id === order.id
        )
        for (const comp of orderComponents) {
          comp.consumed_qty = comp.required_qty
          const componentStock = stock.find(
            (s) => s.product_id === comp.component_id && s.warehouse_id === order.warehouse_id && s.variation_id === null
          )
          if (componentStock) {
            componentStock.quantity = Math.max(0, componentStock.quantity - comp.consumed_qty)
          }
        }
      } else if (status === 'cancelled') {
        order.status = 'cancelled'
        order.updated_at = now
      } else {
        return NextResponse.json(
          { error: 'Status invalido. Valores aceitos: in_progress, completed, cancelled.' },
          { status: 400 }
        )
      }
    } else {
      // General edit — no status change, no stock adjustments
      if (quantity !== undefined && quantity >= 1) order.quantity = quantity
      if (assigned_workers !== undefined) order.assigned_workers = assigned_workers
      if (notes !== undefined) order.notes = notes || null
      if (planned_date !== undefined) order.planned_date = planned_date || null
      if (started_at !== undefined) order.started_at = started_at || null
      if (completed_at !== undefined) order.completed_at = completed_at || null
      if (quantity_produced !== undefined) order.quantity_produced = quantity_produced
      if (quantity_lost !== undefined) order.quantity_lost = quantity_lost
      order.updated_at = now
    }

    productionOrders[orderIndex] = order

    const product = products.find((p) => p.id === order.product_id)

    return NextResponse.json({
      data: {
        ...order,
        product_name: product?.name ?? 'Produto desconhecido',
        product_sku: product?.sku ?? '-',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Erro ao processar a requisicao.' },
      { status: 500 }
    )
  }
}
