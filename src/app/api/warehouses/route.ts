import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/warehouses — list all warehouses
export async function GET() {
  try {
    const { data, error } = await db()
      .from('erp_warehouses')
      .select('*')

    if (error) {
      console.error('GET /api/warehouses error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (err) {
    console.error('GET /api/warehouses unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/warehouses — create a new warehouse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, address, active } = body

    if (!name?.trim() || !code?.trim()) {
      return NextResponse.json(
        { error: 'Nome e codigo sao obrigatorios.' },
        { status: 400 }
      )
    }

    const supabase = db()

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('erp_warehouses')
      .select('id')
      .eq('code', code.trim())
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Codigo ja existe.' },
        { status: 400 }
      )
    }

    const { data: newWarehouse, error } = await supabase
      .from('erp_warehouses')
      .insert({
        name: name.trim(),
        code: code.trim(),
        address: address?.trim() || null,
        active: active ?? true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/warehouses error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: newWarehouse }, { status: 201 })
  } catch (err) {
    console.error('POST /api/warehouses unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}

// PATCH /api/warehouses — update a warehouse
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, code, address, active } = body

    if (!id) {
      return NextResponse.json({ error: 'id e obrigatorio.' }, { status: 400 })
    }

    const supabase = db()

    // Check exists
    const { data: existing, error: checkErr } = await supabase
      .from('erp_warehouses')
      .select('id')
      .eq('id', id)
      .single()

    if (checkErr || !existing) {
      return NextResponse.json({ error: 'Deposito nao encontrado.' }, { status: 404 })
    }

    const updatePayload: Record<string, unknown> = {}

    if (name !== undefined) updatePayload.name = name.trim()
    if (code !== undefined) {
      // Check for duplicate code
      const { data: dup } = await supabase
        .from('erp_warehouses')
        .select('id')
        .eq('code', code.trim())
        .neq('id', id)
        .limit(1)
        .maybeSingle()

      if (dup) {
        return NextResponse.json({ error: 'Codigo ja existe.' }, { status: 400 })
      }
      updatePayload.code = code.trim()
    }
    if (address !== undefined) updatePayload.address = address?.trim() || null
    if (active !== undefined) updatePayload.active = active

    const { data: updated, error } = await supabase
      .from('erp_warehouses')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('PATCH /api/warehouses error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('PATCH /api/warehouses unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro ao processar.' },
      { status: 500 }
    )
  }
}
