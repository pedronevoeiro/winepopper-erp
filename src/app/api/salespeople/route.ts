import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/salespeople — list active salespeople
export async function GET() {
  try {
    const { data, error } = await db()
      .from('erp_salespeople')
      .select('*')
      .eq('active', true)

    if (error) {
      console.error('GET /api/salespeople error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (err) {
    console.error('GET /api/salespeople unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/salespeople — create a new salesperson
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: name' },
        { status: 400 }
      )
    }

    if (body.commission_rate === undefined || body.commission_rate === null) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: commission_rate' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const { data: newSalesperson, error } = await db()
      .from('erp_salespeople')
      .insert({
        user_id: body.user_id || null,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        commission_rate: body.commission_rate,
        active: body.active ?? true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/salespeople error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: newSalesperson }, { status: 201 })
  } catch (err) {
    console.error('POST /api/salespeople unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
