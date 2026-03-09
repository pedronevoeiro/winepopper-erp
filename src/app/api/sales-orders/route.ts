import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpOrderStatus, ErpPaymentMethod } from '@/types/database'

// GET /api/sales-orders?status=xxx&company_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const statusFilter = searchParams.get('status') as ErpOrderStatus | null
    const companyFilter = searchParams.get('company_id')

    let query = db()
      .from('erp_sales_orders')
      .select('*, contact:erp_contacts(*), salesperson:erp_salespeople(*), company:erp_companies(*), items:erp_sales_order_items(*)')
      .order('order_date', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    if (companyFilter) {
      query = query.eq('company_id', companyFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('GET /api/sales-orders error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (err) {
    console.error('GET /api/sales-orders unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
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

    const supabase = db()

    // Generate order number: max existing + 1
    const { data: maxRow } = await supabase
      .from('erp_sales_orders')
      .select('order_number')
      .order('order_number', { ascending: false })
      .limit(1)
      .single()

    const orderNumber = (maxRow?.order_number ?? 0) + 1
    const now = new Date().toISOString()

    // Calculate totals from items
    let subtotal = 0
    let discountValue = 0
    const itemInserts: Array<Record<string, unknown>> = []

    for (const item of body.items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: 'Cada item precisa ter product_id e quantity >= 1.' },
          { status: 400 }
        )
      }

      // Fetch product for defaults
      let unitPrice = item.unit_price
      let description = item.description ?? ''
      let sku: string | null = null
      let ncm: string | null = null
      let cfop: string | null = null

      if (!unitPrice || !description) {
        const { data: product } = await supabase
          .from('erp_products')
          .select('name, sku, sell_price, ncm, cfop_venda')
          .eq('id', item.product_id)
          .single()

        if (product) {
          unitPrice = unitPrice ?? product.sell_price ?? 0
          description = description || product.name
          sku = product.sku ?? null
          ncm = product.ncm ?? null
          cfop = product.cfop_venda ?? null
        }
      }

      unitPrice = unitPrice ?? 0
      const quantity = Number(item.quantity)
      const discount = Number(item.discount ?? 0)
      const lineTotal = quantity * unitPrice - discount

      subtotal += quantity * unitPrice
      discountValue += discount

      itemInserts.push({
        order_id: '__PLACEHOLDER__',
        product_id: item.product_id,
        variation_id: item.variation_id ?? null,
        description,
        sku,
        quantity,
        unit_price: unitPrice,
        discount_pct: 0,
        total: lineTotal,
        ncm,
        cfop,
      })
    }

    const shippingCost = Number(body.shipping_cost ?? 0)
    const total = subtotal - discountValue + shippingCost
    const status: ErpOrderStatus = body.status === 'draft' ? 'draft' : 'pending'

    // Insert order
    const { data: newOrder, error: orderError } = await supabase
      .from('erp_sales_orders')
      .insert({
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
        sales_channel: body.sales_channel ?? null,
        store_name: body.store_name ?? null,
        notes: body.notes ?? null,
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        internal_notes: null,
        created_by: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (orderError || !newOrder) {
      console.error('POST /api/sales-orders insert order error:', orderError)
      return NextResponse.json({ error: orderError?.message ?? 'Erro ao criar pedido.' }, { status: 500 })
    }

    // Insert items with real order_id
    const itemsWithOrderId = itemInserts.map((item) => ({
      ...item,
      order_id: newOrder.id,
    }))

    const { data: newItems, error: itemsError } = await supabase
      .from('erp_sales_order_items')
      .insert(itemsWithOrderId)
      .select()

    if (itemsError) {
      console.error('POST /api/sales-orders insert items error:', itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        data: {
          ...newOrder,
          items: newItems ?? [],
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/sales-orders unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
