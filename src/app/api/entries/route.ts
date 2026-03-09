import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/entries — list all purchase entries with supplier name, company name and item count
export async function GET() {
  try {
    const { data, error } = await db()
      .from('erp_purchase_entries')
      .select('*, supplier:erp_contacts(name), company:erp_companies(name, trade_name), items:erp_purchase_entry_items(id)')
      .order('entry_date', { ascending: false })

    if (error) {
      console.error('GET /api/entries error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const enriched = (data ?? []).map((entry) => {
      const supplier = entry.supplier as { name: string } | null
      const company = entry.company as { name: string; trade_name: string | null } | null
      const items = entry.items as Array<{ id: string }> | null
      return {
        ...entry,
        supplier: undefined,
        company: undefined,
        items: undefined,
        supplier_name: supplier?.name ?? 'Fornecedor desconhecido',
        company_name: company?.trade_name || company?.name || null,
        item_count: items?.length ?? 0,
      }
    })

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
    })
  } catch (err) {
    console.error('GET /api/entries unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/entries — create a purchase entry with items and update stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    const { supplier_id, warehouse_id, company_id, invoice_number, invoice_series, invoice_key, total_shipping, total_other, notes, items } = body as {
      supplier_id: string
      warehouse_id: string
      company_id?: string
      invoice_number?: string
      invoice_series?: string
      invoice_key?: string
      total_shipping?: number
      total_other?: number
      notes?: string
      items: { product_id: string; variation_id?: string | null; quantity: number; unit_cost: number }[]
    }

    // Validate required fields
    if (!supplier_id || !warehouse_id) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: supplier_id, warehouse_id' },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Pelo menos um item e obrigatorio.' },
        { status: 400 }
      )
    }

    // Validate supplier exists
    const { data: supplier, error: supErr } = await supabase
      .from('erp_contacts')
      .select('name')
      .eq('id', supplier_id)
      .single()

    if (supErr || !supplier) {
      return NextResponse.json(
        { error: 'Fornecedor nao encontrado.' },
        { status: 404 }
      )
    }

    // Validate warehouse exists
    const { data: warehouse, error: whErr } = await supabase
      .from('erp_warehouses')
      .select('id')
      .eq('id', warehouse_id)
      .single()

    if (whErr || !warehouse) {
      return NextResponse.json(
        { error: 'Deposito nao encontrado.' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // Calculate totals
    const totalProducts = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
    const shipping = total_shipping ?? 0
    const other = total_other ?? 0

    // Insert entry
    const { data: newEntry, error: entryErr } = await supabase
      .from('erp_purchase_entries')
      .insert({
        supplier_id,
        company_id: company_id || null,
        invoice_number: invoice_number || null,
        invoice_series: invoice_series || null,
        invoice_key: invoice_key || null,
        total_products: totalProducts,
        total_shipping: shipping,
        total_other: other,
        total: totalProducts + shipping + other,
        entry_date: now,
        issue_date: null,
        status: 'received',
        warehouse_id,
        notes: notes || null,
        created_by: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (entryErr || !newEntry) {
      console.error('POST /api/entries insert entry error:', entryErr)
      return NextResponse.json({ error: entryErr?.message ?? 'Erro ao criar entrada.' }, { status: 500 })
    }

    // Create items and update stock
    const itemInserts = items.map((item) => ({
      entry_id: newEntry.id,
      product_id: item.product_id,
      variation_id: item.variation_id || null,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total: item.quantity * item.unit_cost,
    }))

    const { data: createdItems, error: itemsErr } = await supabase
      .from('erp_purchase_entry_items')
      .insert(itemInserts)
      .select()

    if (itemsErr) {
      console.error('POST /api/entries insert items error:', itemsErr)
    }

    // Update stock for each item (filtered by company_id when provided)
    for (const item of items) {
      const variationId = item.variation_id || null

      // Try to find existing stock entry
      let stockQuery = supabase
        .from('erp_stock')
        .select('*')
        .eq('product_id', item.product_id)
        .eq('warehouse_id', warehouse_id)

      if (variationId) {
        stockQuery = stockQuery.eq('variation_id', variationId)
      } else {
        stockQuery = stockQuery.is('variation_id', null)
      }

      if (company_id) {
        stockQuery = stockQuery.eq('company_id', company_id)
      } else {
        stockQuery = stockQuery.is('company_id', null)
      }

      const { data: existingStock } = await stockQuery

      if (existingStock && existingStock.length > 0) {
        await supabase
          .from('erp_stock')
          .update({ quantity: existingStock[0].quantity + item.quantity })
          .eq('id', existingStock[0].id)
      } else {
        // Create new stock entry
        await supabase.from('erp_stock').insert({
          product_id: item.product_id,
          variation_id: variationId,
          warehouse_id,
          company_id: company_id || null,
          quantity: item.quantity,
          reserved: 0,
          min_quantity: 0,
        })
      }
    }

    return NextResponse.json({
      data: {
        ...newEntry,
        supplier_name: supplier.name,
        items: createdItems ?? [],
      },
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/entries unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
