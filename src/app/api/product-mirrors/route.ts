import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/product-mirrors?source_company_id=xxx
export async function GET(request: NextRequest) {
  try {
    const sourceCompanyId = request.nextUrl.searchParams.get('source_company_id')

    let query = db()
      .from('erp_product_mirrors')
      .select(`
        *,
        source_company:erp_companies!erp_product_mirrors_source_company_id_fkey(id, name, trade_name),
        source_product:erp_products!erp_product_mirrors_source_product_id_fkey(id, name, sku),
        target_company:erp_companies!erp_product_mirrors_target_company_id_fkey(id, name, trade_name),
        target_product:erp_products!erp_product_mirrors_target_product_id_fkey(id, name, sku)
      `)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (sourceCompanyId) {
      query = query.eq('source_company_id', sourceCompanyId)
    }

    const { data, error } = await query

    if (error) {
      console.error('GET /api/product-mirrors error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/product-mirrors unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/product-mirrors — create or update a mirror mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      source_company_id,
      source_product_id,
      source_variation_id,
      target_company_id,
      target_product_id,
      target_variation_id,
      quantity_ratio,
    } = body

    if (!source_company_id || !source_product_id || !target_company_id || !target_product_id) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: source_company_id, source_product_id, target_company_id, target_product_id' },
        { status: 400 }
      )
    }

    const supabase = db()

    // Check if mapping already exists for this source
    const { data: existing } = await supabase
      .from('erp_product_mirrors')
      .select('id')
      .eq('source_company_id', source_company_id)
      .eq('source_product_id', source_product_id)
      .eq('active', true)
      .maybeSingle()

    if (existing) {
      // Update existing mapping
      const { data, error } = await supabase
        .from('erp_product_mirrors')
        .update({
          target_company_id,
          target_product_id,
          target_variation_id: target_variation_id || null,
          quantity_ratio: quantity_ratio ?? 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('POST /api/product-mirrors update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data, updated: true })
    }

    // Create new mapping
    const { data, error } = await supabase
      .from('erp_product_mirrors')
      .insert({
        source_company_id,
        source_product_id,
        source_variation_id: source_variation_id || null,
        target_company_id,
        target_product_id,
        target_variation_id: target_variation_id || null,
        quantity_ratio: quantity_ratio ?? 1,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/product-mirrors insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/product-mirrors unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// DELETE /api/product-mirrors?id=xxx — soft delete a mirror mapping
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Query param id e obrigatorio.' }, { status: 400 })
    }

    const { error } = await db()
      .from('erp_product_mirrors')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('DELETE /api/product-mirrors error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/product-mirrors unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
