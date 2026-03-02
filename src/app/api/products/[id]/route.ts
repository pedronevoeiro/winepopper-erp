import { NextRequest, NextResponse } from 'next/server'
import { products, productVariations, bomComponents, stock } from '@/lib/data'
import type { ErpProductVariation } from '@/types/database'

// GET /api/products/[id] — single product with variations, BOM (enriched), and stock
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const product = products.find((p) => p.id === id)
  if (!product) {
    return NextResponse.json({ error: 'Produto nao encontrado.' }, { status: 404 })
  }

  const variations = productVariations.filter((v) => v.product_id === id)

  // Enrich BOM components with component product name
  const bom = bomComponents
    .filter((b) => b.parent_id === id)
    .map((b) => {
      const componentProduct = products.find((p) => p.id === b.component_id)
      return {
        ...b,
        component_name: componentProduct?.name ?? 'Componente desconhecido',
        component_sku: componentProduct?.sku ?? null,
      }
    })

  const stockEntries = stock.filter((s) => s.product_id === id)

  return NextResponse.json({
    data: {
      ...product,
      variations,
      bom_components: bom,
      stock: stockEntries,
    },
  })
}

// PATCH /api/products/[id] — partial update (active, images, variations management)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const productIndex = products.findIndex((p) => p.id === id)
    if (productIndex === -1) {
      return NextResponse.json({ error: 'Produto nao encontrado.' }, { status: 404 })
    }

    const product = products[productIndex]
    const now = new Date().toISOString()

    // Update simple fields
    if (body.active !== undefined) {
      product.active = body.active
    }
    if (body.images !== undefined) {
      product.images = body.images
    }
    if (body.name !== undefined) {
      product.name = body.name
    }
    if (body.description !== undefined) {
      product.description = body.description
    }
    if (body.cost_price !== undefined) {
      product.cost_price = body.cost_price
    }
    if (body.sell_price !== undefined) {
      product.sell_price = body.sell_price
    }
    if (body.category !== undefined) {
      product.category = body.category
    }

    // Manage variations — add new ones
    const addedVariations: ErpProductVariation[] = []
    if (Array.isArray(body.add_variations)) {
      for (const v of body.add_variations) {
        const variation: ErpProductVariation = {
          id: crypto.randomUUID(),
          product_id: id,
          name: v.name,
          sku: v.sku || null,
          additional_cost: v.additional_cost ?? 0,
          additional_price: v.additional_price ?? 0,
          active: v.active ?? true,
          images: Array.isArray(v.images) ? v.images : [],
        }
        productVariations.push(variation)
        addedVariations.push(variation)
      }
    }

    // Manage variations — remove by ID
    if (Array.isArray(body.remove_variation_ids)) {
      for (const varId of body.remove_variation_ids) {
        const idx = productVariations.findIndex(
          (v) => v.id === varId && v.product_id === id
        )
        if (idx !== -1) {
          productVariations.splice(idx, 1)
          // Also remove associated stock entries
          const stockIdx = stock.findIndex(
            (s) => s.variation_id === varId && s.product_id === id
          )
          if (stockIdx !== -1) {
            stock.splice(stockIdx, 1)
          }
        }
      }
    }

    product.updated_at = now
    products[productIndex] = product

    const currentVariations = productVariations.filter((v) => v.product_id === id)

    return NextResponse.json({
      data: {
        ...product,
        variations: currentVariations,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
