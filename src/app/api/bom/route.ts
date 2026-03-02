import { NextRequest, NextResponse } from 'next/server'
import { bomComponents, products, stock } from '@/lib/data'
import type { ErpBomComponent } from '@/types/database'

// GET /api/bom?product_id=xxx — return BOM components enriched with component name and stock
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('product_id')

  if (!productId) {
    return NextResponse.json(
      { error: 'Query param product_id e obrigatorio.' },
      { status: 400 }
    )
  }

  const bom = bomComponents
    .filter((b) => b.parent_id === productId)
    .map((b) => {
      const componentProduct = products.find((p) => p.id === b.component_id)
      const componentStocks = stock.filter((s) => s.product_id === b.component_id)
      const totalStock = componentStocks.reduce((sum, s) => sum + s.quantity, 0)
      const totalReserved = componentStocks.reduce((sum, s) => sum + s.reserved, 0)

      return {
        ...b,
        component_name: componentProduct?.name ?? 'Componente desconhecido',
        component_sku: componentProduct?.sku ?? null,
        stock_quantity: totalStock,
        stock_available: totalStock - totalReserved,
      }
    })

  return NextResponse.json({
    data: bom,
    count: bom.length,
  })
}

// POST /api/bom — replace entire BOM for a product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { product_id, components } = body as {
      product_id: string
      components: { component_id: string; quantity: number; notes?: string }[]
    }

    if (!product_id) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: product_id' },
        { status: 400 }
      )
    }

    if (!Array.isArray(components)) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: components (array)' },
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

    // Delete existing BOM entries for this product
    let idx = bomComponents.length
    while (idx--) {
      if (bomComponents[idx].parent_id === product_id) {
        bomComponents.splice(idx, 1)
      }
    }

    // Insert new BOM entries
    const created: ErpBomComponent[] = []
    for (const comp of components) {
      const entry: ErpBomComponent = {
        id: crypto.randomUUID(),
        parent_id: product_id,
        component_id: comp.component_id,
        quantity: comp.quantity,
        notes: comp.notes || null,
      }
      bomComponents.push(entry)
      created.push(entry)
    }

    return NextResponse.json({
      data: created,
      count: created.length,
    }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
