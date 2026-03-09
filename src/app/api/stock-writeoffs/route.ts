import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stock-writeoffs?sales_order_id=xxx — list writeoffs for a sales order
export async function GET(request: NextRequest) {
  try {
    const salesOrderId = request.nextUrl.searchParams.get('sales_order_id')

    if (!salesOrderId) {
      return NextResponse.json(
        { error: 'Query param sales_order_id e obrigatorio.' },
        { status: 400 }
      )
    }

    const { data, error } = await db()
      .from('erp_stock_writeoffs')
      .select('*, product:erp_products(name, sku), company:erp_companies(name, trade_name), warehouse:erp_warehouses(name, code)')
      .eq('sales_order_id', salesOrderId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('GET /api/stock-writeoffs error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const enriched = (data ?? []).map((w) => {
      const product = w.product as { name: string; sku: string | null } | null
      const company = w.company as { name: string; trade_name: string | null } | null
      const warehouse = w.warehouse as { name: string; code: string } | null
      return {
        ...w,
        product: undefined,
        company: undefined,
        warehouse: undefined,
        product_name: product?.name ?? 'Produto desconhecido',
        product_sku: product?.sku ?? null,
        company_name: company?.trade_name || company?.name || 'Empresa desconhecida',
        warehouse_name: warehouse?.name ?? 'Deposito desconhecido',
        warehouse_code: warehouse?.code ?? '',
      }
    })

    return NextResponse.json({ data: enriched, count: enriched.length })
  } catch (err) {
    console.error('GET /api/stock-writeoffs unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/stock-writeoffs — execute stock writeoffs for a sales order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    const { sales_order_id, writeoffs } = body as {
      sales_order_id: string
      writeoffs: {
        order_item_id?: string
        product_id: string
        variation_id?: string | null
        company_id: string
        warehouse_id: string
        quantity: number
        is_mirror?: boolean
        notes?: string
      }[]
    }

    if (!sales_order_id) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: sales_order_id' },
        { status: 400 }
      )
    }

    if (!Array.isArray(writeoffs) || writeoffs.length === 0) {
      return NextResponse.json(
        { error: 'Pelo menos um writeoff e obrigatorio.' },
        { status: 400 }
      )
    }

    // Validate sales order exists
    const { data: order, error: orderErr } = await supabase
      .from('erp_sales_orders')
      .select('id, status, company_id')
      .eq('id', sales_order_id)
      .single()

    if (orderErr || !order) {
      return NextResponse.json(
        { error: 'Pedido nao encontrado.' },
        { status: 404 }
      )
    }

    const results: Array<Record<string, unknown>> = []

    for (const wo of writeoffs) {
      if (!wo.product_id || !wo.company_id || !wo.warehouse_id || !wo.quantity || wo.quantity <= 0) {
        continue
      }

      const variationId = wo.variation_id || null

      // Check stock availability
      let stockQuery = supabase
        .from('erp_stock')
        .select('*')
        .eq('product_id', wo.product_id)
        .eq('warehouse_id', wo.warehouse_id)
        .eq('company_id', wo.company_id)

      if (variationId) {
        stockQuery = stockQuery.eq('variation_id', variationId)
      } else {
        stockQuery = stockQuery.is('variation_id', null)
      }

      const { data: stockEntries } = await stockQuery

      if (!stockEntries || stockEntries.length === 0) {
        // No stock entry — skip with warning
        continue
      }

      const stockEntry = stockEntries[0]
      const newQty = Math.max(0, stockEntry.quantity - wo.quantity)

      // Deduct stock
      await supabase
        .from('erp_stock')
        .update({ quantity: newQty })
        .eq('id', stockEntry.id)

      // Create stock movement
      await supabase.from('erp_stock_movements').insert({
        product_id: wo.product_id,
        variation_id: variationId,
        warehouse_id: wo.warehouse_id,
        company_id: wo.company_id,
        quantity: -wo.quantity,
        type: 'sale',
        reference_type: 'sales_order',
        reference_id: sales_order_id,
        notes: wo.is_mirror
          ? `Baixa espelho (outra empresa) - Pedido #${sales_order_id.substring(0, 8)}`
          : `Baixa de estoque - Pedido #${sales_order_id.substring(0, 8)}`,
        created_by: null,
        created_at: new Date().toISOString(),
      })

      // Insert writeoff record
      const { data: created, error: woErr } = await supabase
        .from('erp_stock_writeoffs')
        .insert({
          sales_order_id,
          order_item_id: wo.order_item_id || null,
          product_id: wo.product_id,
          variation_id: variationId,
          company_id: wo.company_id,
          warehouse_id: wo.warehouse_id,
          quantity: wo.quantity,
          is_mirror: wo.is_mirror || false,
          notes: wo.notes || null,
          created_by: null,
        })
        .select()
        .single()

      if (woErr) {
        console.error('POST /api/stock-writeoffs insert error:', woErr)
      } else if (created) {
        results.push(created)
      }
    }

    return NextResponse.json({
      data: results,
      count: results.length,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/stock-writeoffs unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro ao processar baixa de estoque.' },
      { status: 500 }
    )
  }
}
