import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpProductType } from '@/types/database'

// GET /api/products — list products with stock info, optionally filtered by type
export async function GET(request: NextRequest) {
  try {
    const typeParam = request.nextUrl.searchParams.get('type') as ErpProductType | null

    const supabase = db()

    let query = supabase
      .from('erp_products')
      .select('*, variations:erp_product_variations(*), stock_entries:erp_stock(*)')

    if (typeParam) {
      query = query.eq('product_type', typeParam)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('GET /api/products error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Compute stock aggregation and producible_quantity to match the previous API contract
    const productsWithStock = await Promise.all(
      (products ?? []).map(async (product) => {
        const stockEntries = (product.stock_entries ?? []) as Array<{
          quantity: number
          reserved: number
          min_quantity: number
        }>

        const totalQty = stockEntries.reduce((sum, s) => sum + s.quantity, 0)
        const totalReserved = stockEntries.reduce((sum, s) => sum + s.reserved, 0)
        const minQty = stockEntries.reduce((sum, s) => sum + s.min_quantity, 0)

        // Compute producible_quantity from BOM
        let producibleQuantity = 0
        if (product.product_type === 'produto_final') {
          const { data: bom } = await supabase
            .from('erp_bom_components')
            .select('component_id, quantity')
            .eq('parent_id', product.id)

          if (bom && bom.length > 0) {
            const quantities = await Promise.all(
              bom.map(async (component) => {
                const { data: compStock } = await supabase
                  .from('erp_stock')
                  .select('quantity, reserved')
                  .eq('product_id', component.component_id)

                const totalAvailable = (compStock ?? []).reduce(
                  (sum, s) => sum + s.quantity - s.reserved,
                  0
                )
                return Math.floor(totalAvailable / component.quantity)
              })
            )
            producibleQuantity = Math.min(...quantities)
          }
        }

        return {
          ...product,
          stock_entries: undefined,
          stock_quantity: totalQty,
          stock_reserved: totalReserved,
          stock_available: totalQty - totalReserved,
          min_quantity: minQty,
          variations: product.variations ?? [],
          producible_quantity: producibleQuantity,
        }
      })
    )

    return NextResponse.json({
      data: productsWithStock,
      count: productsWithStock.length,
    })
  } catch (err) {
    console.error('GET /api/products unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/products — create a new product with optional variations, BOM, and images
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    const hasVariations = Array.isArray(body.variations) && body.variations.length > 0

    // Validate required fields
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
      const { data: existing } = await supabase
        .from('erp_products')
        .select('id')
        .ilike('sku', body.sku)
        .limit(1)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'Ja existe um produto com este SKU.' },
          { status: 409 }
        )
      }
    }

    const now = new Date().toISOString()

    // Insert product
    const { data: newProduct, error: productError } = await supabase
      .from('erp_products')
      .insert({
        sku: hasVariations ? (body.sku || null) : body.sku,
        name: body.name,
        description: body.description || null,
        product_type: body.product_type ?? 'produto_final',
        structure: body.structure ?? 'simples',
        supplier_id: body.supplier_id ?? null,
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
      })
      .select()
      .single()

    if (productError || !newProduct) {
      console.error('POST /api/products insert error:', productError)
      return NextResponse.json({ error: productError?.message ?? 'Erro ao criar produto.' }, { status: 500 })
    }

    const productId = newProduct.id

    // Find default warehouse
    const { data: defaultWarehouse } = await supabase
      .from('erp_warehouses')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    // Create variations and their stock entries
    let createdVariations: Array<Record<string, unknown>> = []
    if (hasVariations) {
      const variationInserts = body.variations.map((v: Record<string, unknown>) => ({
        product_id: productId,
        name: v.name,
        sku: v.sku || null,
        additional_cost: v.additional_cost ?? 0,
        additional_price: v.additional_price ?? 0,
        active: v.active ?? true,
        images: Array.isArray(v.images) ? v.images : [],
      }))

      const { data: vars, error: varError } = await supabase
        .from('erp_product_variations')
        .insert(variationInserts)
        .select()

      if (varError) {
        console.error('POST /api/products insert variations error:', varError)
      }
      createdVariations = vars ?? []

      // Create stock entries per variation
      if (defaultWarehouse && createdVariations.length > 0) {
        const stockInserts = createdVariations.map((v) => ({
          product_id: productId,
          variation_id: v.id,
          warehouse_id: defaultWarehouse.id,
          quantity: 0,
          reserved: 0,
          min_quantity: body.min_stock ?? 0,
        }))

        await supabase.from('erp_stock').insert(stockInserts)
      }
    } else {
      // No variations — create a single stock entry for the product
      if (defaultWarehouse) {
        await supabase.from('erp_stock').insert({
          product_id: productId,
          variation_id: null,
          warehouse_id: defaultWarehouse.id,
          quantity: 0,
          reserved: 0,
          min_quantity: body.min_stock ?? 0,
        })
      }
    }

    // Create BOM components
    let createdBom: Array<Record<string, unknown>> = []
    if (Array.isArray(body.bom_components) && body.bom_components.length > 0) {
      const bomInserts = body.bom_components.map((bc: Record<string, unknown>) => ({
        parent_id: productId,
        component_id: bc.component_id,
        quantity: bc.quantity,
        notes: bc.notes || null,
      }))

      const { data: bom, error: bomError } = await supabase
        .from('erp_bom_components')
        .insert(bomInserts)
        .select()

      if (bomError) {
        console.error('POST /api/products insert BOM error:', bomError)
      }
      createdBom = bom ?? []
    }

    return NextResponse.json({
      data: {
        ...newProduct,
        variations: createdVariations,
        bom_components: createdBom,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/products unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
