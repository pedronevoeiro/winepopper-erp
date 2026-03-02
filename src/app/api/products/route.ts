import { NextRequest, NextResponse } from 'next/server'
import { products, productVariations, bomComponents, stock, warehouses, getProductsWithStock } from '@/lib/data'
import type { ErpProduct, ErpProductVariation, ErpStock, ErpBomComponent, ErpProductType } from '@/types/database'

// GET /api/products — list products with stock info, optionally filtered by type
export async function GET(request: NextRequest) {
  const typeParam = request.nextUrl.searchParams.get('type') as ErpProductType | null

  let productsWithStock = getProductsWithStock()

  if (typeParam) {
    productsWithStock = productsWithStock.filter((p) => p.product_type === typeParam)
  }

  return NextResponse.json({
    data: productsWithStock,
    count: productsWithStock.length,
  })
}

// POST /api/products — create a new product with optional variations, BOM, and images
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const hasVariations = Array.isArray(body.variations) && body.variations.length > 0

    // Validate required fields — sku can be null when variations are provided
    if (!hasVariations && !body.sku) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: sku (ou variations[]), name' },
        { status: 400 }
      )
    }

    if (!body.name) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: name' },
        { status: 400 }
      )
    }

    if (!body.sell_price || body.sell_price <= 0) {
      return NextResponse.json(
        { error: 'Preco de venda e obrigatorio e deve ser maior que zero.' },
        { status: 400 }
      )
    }

    // Check for duplicate SKU (only if sku is provided)
    if (body.sku) {
      const existing = products.find(
        (p) => p.sku && p.sku.toLowerCase() === body.sku.toLowerCase()
      )
      if (existing) {
        return NextResponse.json(
          { error: 'Ja existe um produto com este SKU.' },
          { status: 409 }
        )
      }
    }

    const now = new Date().toISOString()
    const productId = crypto.randomUUID()

    const newProduct: ErpProduct = {
      id: productId,
      sku: hasVariations ? (body.sku || null) : body.sku,
      name: body.name,
      description: body.description || null,
      product_type: body.product_type ?? 'produto_final',
      cost_price: body.cost_price ?? 0,
      sell_price: body.sell_price,
      weight_grams: body.weight_g ?? 0,
      height_cm: body.height_cm ?? 0,
      width_cm: body.width_cm ?? 0,
      length_cm: body.depth_cm ?? 0,
      category: body.category ?? null,
      brand: body.brand ?? null,
      material: body.material || null,
      ncm: body.ncm || null,
      cest: null,
      origin: body.origin ?? 0,
      cfop_venda: body.cfop || '5102',
      images: Array.isArray(body.images) ? body.images : [],
      active: body.active ?? true,
      manage_stock: true,
      is_kit: false,
      store_product_id: null,
      created_at: now,
      updated_at: now,
    }

    // Add to in-memory products array
    products.push(newProduct)

    const defaultWarehouse = warehouses.find((w) => w.active)

    // Create variations and their stock entries
    const createdVariations: ErpProductVariation[] = []
    if (hasVariations) {
      for (const v of body.variations) {
        const variation: ErpProductVariation = {
          id: crypto.randomUUID(),
          product_id: productId,
          name: v.name,
          sku: v.sku || null,
          additional_cost: v.additional_cost ?? 0,
          additional_price: v.additional_price ?? 0,
          active: v.active ?? true,
          images: Array.isArray(v.images) ? v.images : [],
        }
        productVariations.push(variation)
        createdVariations.push(variation)

        // Create stock entry per variation
        if (defaultWarehouse) {
          const variationStock: ErpStock = {
            id: crypto.randomUUID(),
            product_id: productId,
            variation_id: variation.id,
            warehouse_id: defaultWarehouse.id,
            quantity: 0,
            reserved: 0,
            min_quantity: body.min_stock ?? 0,
          }
          stock.push(variationStock)
        }
      }
    } else {
      // No variations — create a single stock entry for the product
      if (defaultWarehouse) {
        const newStock: ErpStock = {
          id: crypto.randomUUID(),
          product_id: productId,
          variation_id: null,
          warehouse_id: defaultWarehouse.id,
          quantity: 0,
          reserved: 0,
          min_quantity: body.min_stock ?? 0,
        }
        stock.push(newStock)
      }
    }

    // Create BOM components
    const createdBom: ErpBomComponent[] = []
    if (Array.isArray(body.bom_components) && body.bom_components.length > 0) {
      for (const bc of body.bom_components) {
        const bomEntry: ErpBomComponent = {
          id: crypto.randomUUID(),
          parent_id: productId,
          component_id: bc.component_id,
          quantity: bc.quantity,
          notes: bc.notes || null,
        }
        bomComponents.push(bomEntry)
        createdBom.push(bomEntry)
      }
    }

    return NextResponse.json({
      data: {
        ...newProduct,
        variations: createdVariations,
        bom_components: createdBom,
      },
    }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
