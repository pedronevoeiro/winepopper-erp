import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpInvoiceStatus, ErpInvoiceDirection } from '@/types/database'

// GET /api/invoices?status=xxx&direction=xxx&date_from=xxx&date_to=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const statusFilter = searchParams.get('status') as ErpInvoiceStatus | null
    const directionFilter = searchParams.get('direction') as ErpInvoiceDirection | null
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    let query = db()
      .from('erp_invoices')
      .select('*, contact:erp_contacts(id, name, document), sales_order:erp_sales_orders(id, order_number)')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    if (directionFilter) {
      query = query.eq('direction', directionFilter)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    const { data, error } = await query

    if (error) {
      console.error('GET /api/invoices error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const invoices = data ?? []

    // Summary counts by status
    const summary = {
      total: invoices.length,
      draft: invoices.filter((i) => i.status === 'draft').length,
      processing: invoices.filter((i) => i.status === 'processing').length,
      authorized: invoices.filter((i) => i.status === 'authorized').length,
      cancelled: invoices.filter((i) => i.status === 'cancelled').length,
      denied: invoices.filter((i) => i.status === 'denied').length,
    }

    return NextResponse.json({ data: invoices, summary })
  } catch (err) {
    console.error('GET /api/invoices unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/invoices — create a new invoice from a sales order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.sales_order_id) {
      return NextResponse.json(
        { error: 'Campo obrigatório: sales_order_id' },
        { status: 400 }
      )
    }

    const supabase = db()

    // Fetch the sales order with items and contact
    const { data: order, error: orderError } = await supabase
      .from('erp_sales_orders')
      .select('*, contact:erp_contacts(*), items:erp_sales_order_items(*)')
      .eq('id', body.sales_order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado.' },
        { status: 404 }
      )
    }

    // Check order status is approved or later (not draft/pending/cancelled)
    const invalidStatuses = ['draft', 'pending', 'cancelled']
    if (invalidStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Pedido com status "${order.status}" não pode gerar NF-e. O pedido precisa estar aprovado ou em etapa posterior.` },
        { status: 400 }
      )
    }

    // Check no existing authorized invoice for same order
    const { data: existingInvoices } = await supabase
      .from('erp_invoices')
      .select('id, status')
      .eq('sales_order_id', body.sales_order_id)
      .eq('status', 'authorized')

    if (existingInvoices && existingInvoices.length > 0) {
      return NextResponse.json(
        { error: 'Já existe uma NF-e autorizada para este pedido.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const items = order.items ?? []

    // Calculate totals from order items
    const totalProducts = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0)

    // Insert invoice
    const { data: newInvoice, error: insertError } = await supabase
      .from('erp_invoices')
      .insert({
        direction: 'outgoing' as ErpInvoiceDirection,
        status: 'draft' as ErpInvoiceStatus,
        series: body.series ?? 1,
        sales_order_id: order.id,
        contact_id: order.contact_id,
        total_products: totalProducts,
        total_shipping: order.shipping_cost ?? 0,
        total_discount: order.discount_value ?? 0,
        total_tax: 0,
        total: order.total,
        provider: 'manual',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (insertError || !newInvoice) {
      console.error('POST /api/invoices insert error:', insertError)
      return NextResponse.json(
        { error: insertError?.message ?? 'Erro ao criar NF-e.' },
        { status: 500 }
      )
    }

    // Insert invoice items from order items
    if (items.length > 0) {
      const invoiceItems = items.map((item: {
        product_id: string
        variation_id: string | null
        description: string
        sku: string | null
        quantity: number
        unit_price: number
        discount_pct: number
        total: number
        ncm: string | null
        cfop: string | null
      }) => ({
        invoice_id: newInvoice.id,
        product_id: item.product_id,
        variation_id: item.variation_id ?? null,
        description: item.description,
        sku: item.sku ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_pct: item.discount_pct ?? 0,
        total: item.total,
        ncm: item.ncm ?? null,
        cfop: item.cfop ?? null,
      }))

      const { error: itemsError } = await supabase
        .from('erp_invoice_items')
        .insert(invoiceItems)

      if (itemsError) {
        console.error('POST /api/invoices insert items error:', itemsError)
        // Invoice was created but items failed — still return the invoice
        return NextResponse.json(
          { data: newInvoice, warning: 'NF-e criada, mas houve erro ao inserir os itens: ' + itemsError.message },
          { status: 201 }
        )
      }
    }

    return NextResponse.json({ data: newInvoice }, { status: 201 })
  } catch (err) {
    console.error('POST /api/invoices unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}
