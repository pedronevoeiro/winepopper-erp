import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bom?product_id=xxx — return BOM components enriched with component name and stock
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json(
        { error: 'Query param product_id e obrigatorio.' },
        { status: 400 }
      )
    }

    const supabase = db()

    const { data: bom, error } = await supabase
      .from('erp_bom_components')
      .select('*, component:erp_products(name, sku)')
      .eq('parent_id', productId)

    if (error) {
      console.error('GET /api/bom error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with stock info
    const enriched = await Promise.all(
      (bom ?? []).map(async (b) => {
        const component = b.component as { name: string; sku: string | null } | null

        const { data: compStocks } = await supabase
          .from('erp_stock')
          .select('quantity, reserved')
          .eq('product_id', b.component_id)

        const totalStock = (compStocks ?? []).reduce((sum, s) => sum + s.quantity, 0)
        const totalReserved = (compStocks ?? []).reduce((sum, s) => sum + s.reserved, 0)

        return {
          ...b,
          component: undefined,
          component_name: component?.name ?? 'Componente desconhecido',
          component_sku: component?.sku ?? null,
          stock_quantity: totalStock,
          stock_available: totalStock - totalReserved,
        }
      })
    )

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
    })
  } catch (err) {
    console.error('GET /api/bom unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/bom — replace entire BOM for a product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    const { product_id, components } = body as {
      product_id: string
      components: { component_id: string; quantity: number; unit?: string; notes?: string }[]
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
    const { data: product, error: productErr } = await supabase
      .from('erp_products')
      .select('id')
      .eq('id', product_id)
      .single()

    if (productErr || !product) {
      return NextResponse.json(
        { error: 'Produto nao encontrado.' },
        { status: 404 }
      )
    }

    // Delete existing BOM entries for this product
    await supabase
      .from('erp_bom_components')
      .delete()
      .eq('parent_id', product_id)

    // Insert new BOM entries
    if (components.length > 0) {
      const inserts = components.map((comp) => ({
        parent_id: product_id,
        component_id: comp.component_id,
        quantity: comp.quantity,
        unit: comp.unit || 'un',
        notes: comp.notes || null,
      }))

      const { data: created, error: insertErr } = await supabase
        .from('erp_bom_components')
        .insert(inserts)
        .select()

      if (insertErr) {
        console.error('POST /api/bom insert error:', insertErr)
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }

      return NextResponse.json({
        data: created ?? [],
        count: created?.length ?? 0,
      }, { status: 201 })
    }

    return NextResponse.json({
      data: [],
      count: 0,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/bom unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
