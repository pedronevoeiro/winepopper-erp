import { NextRequest, NextResponse } from 'next/server'
import {
  getOrdersWithRelations,
  salesOrders,
  salesOrderItems,
  products,
} from '@/lib/data'
import type {
  ErpOrderStatus,
  ErpPaymentMethod,
  ErpSalesOrder,
  ErpSalesOrderItem,
} from '@/types/database'

// GET /api/sales-orders?status=xxx&company_id=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const statusFilter = searchParams.get('status') as ErpOrderStatus | null
  const companyFilter = searchParams.get('company_id')

  let orders = getOrdersWithRelations()

  // Filter by status
  if (statusFilter) {
    orders = orders.filter((o) => o.status === statusFilter)
  }

  // Filter by company
  if (companyFilter) {
    orders = orders.filter((o) => o.company_id === companyFilter)
  }

  // Sort by order_date descending (most recent first)
  orders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())

  return NextResponse.json({
    data: orders,
    count: orders.length,
  })
}

// POST /api/sales-orders — create a new sales order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.contact_id) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: contact_id' },
        { status: 400 }
      )
    }

    if (!body.company_id) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: company_id' },
        { status: 400 }
      )
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'O pedido precisa ter pelo menos 1 item.' },
        { status: 400 }
      )
    }

    // Generate order number: max existing + 1
    const maxOrderNumber = salesOrders.reduce(
      (max, o) => Math.max(max, o.order_number),
      0
    )
    const orderNumber = maxOrderNumber + 1

    const now = new Date().toISOString()
    const orderId = crypto.randomUUID()

    // Calculate totals from items
    let subtotal = 0
    let discountValue = 0
    const newItems: ErpSalesOrderItem[] = []

    for (const item of body.items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: 'Cada item precisa ter product_id e quantity >= 1.' },
          { status: 400 }
        )
      }

      const product = products.find((p) => p.id === item.product_id)
      const unitPrice = item.unit_price ?? product?.sell_price ?? 0
      const quantity = Number(item.quantity)
      const discount = Number(item.discount ?? 0)
      const lineTotal = quantity * unitPrice - discount

      subtotal += quantity * unitPrice
      discountValue += discount

      newItems.push({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: item.product_id,
        variation_id: item.variation_id ?? null,
        description: product?.name ?? item.description ?? '',
        sku: product?.sku ?? null,
        quantity,
        unit_price: unitPrice,
        discount_pct: 0,
        total: lineTotal,
        ncm: product?.ncm ?? null,
        cfop: product?.cfop_venda ?? null,
      })
    }

    const shippingCost = Number(body.shipping_cost ?? 0)
    const total = subtotal - discountValue + shippingCost

    const status: ErpOrderStatus = body.status === 'draft' ? 'draft' : 'pending'

    const newOrder: ErpSalesOrder = {
      id: orderId,
      order_number: orderNumber,
      contact_id: body.contact_id,
      salesperson_id: body.salesperson_id ?? null,
      status,
      order_date: now,
      expected_date: null,
      subtotal,
      discount_value: discountValue,
      shipping_cost: shippingCost,
      other_costs: 0,
      total,
      payment_method: (body.payment_method as ErpPaymentMethod) ?? null,
      payment_account_id: body.payment_account_id ?? null,
      payment_condition: null,
      installments: 1,
      shipping_address: null,
      shipping_method: null,
      shipping_tracking: null,
      carrier_name: null,
      company_id: body.company_id ?? null,
      store_order_id: null,
      pagarme_id: null,
      melhorenvio_id: null,
      notes: body.notes ?? null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      internal_notes: null,
      created_by: null,
      created_at: now,
      updated_at: now,
    }

    // Push to in-memory arrays
    salesOrders.push(newOrder)
    salesOrderItems.push(...newItems)

    return NextResponse.json(
      {
        data: {
          ...newOrder,
          items: newItems,
        },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
