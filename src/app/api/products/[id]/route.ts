import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products/[id] — single product with variations, BOM (enriched), stock, and supplier
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = db()

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('erp_products')
      .select('*')
      .eq('id', id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Produto nao encontrado.' }, { status: 404 })
    }

    // Fetch variations
    const { data: variations } = await supabase
      .from('erp_product_variations')
      .select('*')
      .eq('product_id', id)

    // Fetch BOM components enriched with component info and stock
    const { data: bomRaw } = await supabase
      .from('erp_bom_components')
      .select('*, component:erp_products(name, sku, cost_price)')
      .eq('parent_id', id)

    const bom = await Promise.all(
      (bomRaw ?? []).map(async (b) => {
        const component = b.component as { name: string; sku: string | null; cost_price: number } | null

        const { data: compStocks } = await supabase
          .from('erp_stock')
          .select('quantity, reserved')
          .eq('product_id', b.component_id)

        const stockAvailable = (compStocks ?? []).reduce(
          (sum, s) => sum + s.quantity - s.reserved,
          0
        )

        return {
          ...b,
          component: undefined,
          component_name: component?.name ?? 'Componente desconhecido',
          component_sku: component?.sku ?? null,
          component_cost: component?.cost_price ?? 0,
          stock_available: stockAvailable,
        }
      })
    )

    // Fetch stock entries
    const { data: stockEntries } = await supabase
      .from('erp_stock')
      .select('*')
      .eq('product_id', id)

    // Get supplier info
    let supplier = null
    if (product.supplier_id) {
      const { data: sup } = await supabase
        .from('erp_contacts')
        .select('*')
        .eq('id', product.supplier_id)
        .single()
      supplier = sup
    }

    // Get recent stock movements for this product
    const { data: movements } = await supabase
      .from('erp_stock_movements')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      data: {
        ...product,
        variations: variations ?? [],
        bom_components: bom,
        stock: stockEntries ?? [],
        supplier,
        stock_movements: movements ?? [],
      },
    })
  } catch (err) {
    console.error('GET /api/products/[id] unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// PATCH /api/products/[id] — update product fields, variations, and BOM
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = db()

    // Check product exists
    const { data: existing, error: checkErr } = await supabase
      .from('erp_products')
      .select('id')
      .eq('id', id)
      .single()

    if (checkErr || !existing) {
      return NextResponse.json({ error: 'Produto nao encontrado.' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Build update payload from body fields
    const updatePayload: Record<string, unknown> = { updated_at: now }

    const stringFields = ['name', 'description', 'sku', 'material', 'category', 'brand', 'ncm', 'cest', 'cfop_venda'] as const
    for (const field of stringFields) {
      if (body[field] !== undefined) {
        updatePayload[field] = body[field] || null
      }
    }

    const numericFields = ['cost_price', 'sell_price', 'weight_grams', 'height_cm', 'width_cm', 'length_cm', 'origin'] as const
    for (const field of numericFields) {
      if (body[field] !== undefined) {
        updatePayload[field] = Number(body[field]) || 0
      }
    }

    if (body.active !== undefined) updatePayload.active = body.active
    if (body.images !== undefined) updatePayload.images = body.images
    if (body.product_type !== undefined) updatePayload.product_type = body.product_type
    if (body.structure !== undefined) updatePayload.structure = body.structure
    if (body.supplier_id !== undefined) updatePayload.supplier_id = body.supplier_id || null
    if (body.manage_stock !== undefined) updatePayload.manage_stock = body.manage_stock

    // Update product
    const { data: updatedProduct, error: updateErr } = await supabase
      .from('erp_products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      console.error('PATCH /api/products/[id] update error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Manage variations — add new ones
    if (Array.isArray(body.add_variations)) {
      const variationInserts = body.add_variations.map((v: Record<string, unknown>) => ({
        product_id: id,
        name: v.name,
        sku: v.sku || null,
        additional_cost: v.additional_cost ?? 0,
        additional_price: v.additional_price ?? 0,
        active: v.active ?? true,
        images: Array.isArray(v.images) ? v.images : [],
      }))

      await supabase.from('erp_product_variations').insert(variationInserts)
    }

    // Manage variations — remove by ID
    if (Array.isArray(body.remove_variation_ids)) {
      for (const varId of body.remove_variation_ids) {
        await supabase
          .from('erp_stock')
          .delete()
          .eq('variation_id', varId)
          .eq('product_id', id)

        await supabase
          .from('erp_product_variations')
          .delete()
          .eq('id', varId)
          .eq('product_id', id)
      }
    }

    // Update min_stock
    if (body.min_stock !== undefined) {
      await supabase
        .from('erp_stock')
        .update({ min_quantity: body.min_stock })
        .eq('product_id', id)
    }

    // Fetch current variations
    const { data: currentVariations } = await supabase
      .from('erp_product_variations')
      .select('*')
      .eq('product_id', id)

    return NextResponse.json({
      data: {
        ...updatedProduct,
        variations: currentVariations ?? [],
      },
    })
  } catch (err) {
    console.error('PATCH /api/products/[id] unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}

// DELETE /api/products/[id] — remove product and all related data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = db()

    // Check product exists
    const { data: existing, error: checkErr } = await supabase
      .from('erp_products')
      .select('id')
      .eq('id', id)
      .single()

    if (checkErr || !existing) {
      return NextResponse.json({ error: 'Produto nao encontrado.' }, { status: 404 })
    }

    // Remove stock entries
    await supabase.from('erp_stock').delete().eq('product_id', id)

    // Remove BOM components (as parent)
    await supabase.from('erp_bom_components').delete().eq('parent_id', id)

    // Remove variations
    await supabase.from('erp_product_variations').delete().eq('product_id', id)

    // Remove product
    const { error: deleteErr } = await supabase
      .from('erp_products')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      console.error('DELETE /api/products/[id] error:', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/products/[id] unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
