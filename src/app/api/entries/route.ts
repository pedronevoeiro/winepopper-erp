import { NextRequest, NextResponse } from 'next/server'
import { purchaseEntries, purchaseEntryItems, contacts, stock, warehouses } from '@/lib/data'
import type { ErpPurchaseEntry, ErpPurchaseEntryItem, ErpStock } from '@/types/database'

// GET /api/entries — list all purchase entries with supplier name and item count
export async function GET() {
  const enriched = purchaseEntries.map((entry) => {
    const supplier = contacts.find((c) => c.id === entry.supplier_id)
    const items = purchaseEntryItems.filter((i) => i.entry_id === entry.id)

    return {
      ...entry,
      supplier_name: supplier?.name ?? 'Fornecedor desconhecido',
      item_count: items.length,
    }
  })

  // Sort by entry_date descending (newest first)
  enriched.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())

  return NextResponse.json({
    data: enriched,
    count: enriched.length,
  })
}

// POST /api/entries — create a purchase entry with items and update stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { supplier_id, warehouse_id, invoice_number, invoice_series, invoice_key, total_shipping, total_other, notes, items } = body as {
      supplier_id: string
      warehouse_id: string
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
    const supplier = contacts.find((c) => c.id === supplier_id)
    if (!supplier) {
      return NextResponse.json(
        { error: 'Fornecedor nao encontrado.' },
        { status: 404 }
      )
    }

    // Validate warehouse exists
    const warehouse = warehouses.find((w) => w.id === warehouse_id)
    if (!warehouse) {
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

    const newEntry: ErpPurchaseEntry = {
      id: crypto.randomUUID(),
      supplier_id,
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
    }

    purchaseEntries.push(newEntry)

    // Create items and update stock
    const createdItems: ErpPurchaseEntryItem[] = []
    for (const item of items) {
      const entryItem: ErpPurchaseEntryItem = {
        id: crypto.randomUUID(),
        entry_id: newEntry.id,
        product_id: item.product_id,
        variation_id: item.variation_id || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total: item.quantity * item.unit_cost,
      }
      purchaseEntryItems.push(entryItem)
      createdItems.push(entryItem)

      // Update stock quantity for this product/variation in the warehouse
      const existingStock = stock.find(
        (s) =>
          s.product_id === item.product_id &&
          s.warehouse_id === warehouse_id &&
          s.variation_id === (item.variation_id || null)
      )

      if (existingStock) {
        existingStock.quantity += item.quantity
      } else {
        // Create new stock entry if one doesn't exist
        const newStock: ErpStock = {
          id: crypto.randomUUID(),
          product_id: item.product_id,
          variation_id: item.variation_id || null,
          warehouse_id,
          quantity: item.quantity,
          reserved: 0,
          min_quantity: 0,
        }
        stock.push(newStock)
      }
    }

    return NextResponse.json({
      data: {
        ...newEntry,
        supplier_name: supplier.name,
        items: createdItems,
      },
    }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
