import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/production-workers — list all production workers
export async function GET() {
  try {
    const { data, error } = await db()
      .from('erp_production_workers')
      .select('*')

    if (error) {
      console.error('GET /api/production-workers error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (err) {
    console.error('GET /api/production-workers unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/production-workers — create a new production worker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: name' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const { data: newWorker, error } = await db()
      .from('erp_production_workers')
      .insert({
        name: body.name,
        role: body.role || null,
        phone: body.phone || null,
        active: body.active ?? true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/production-workers error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: newWorker }, { status: 201 })
  } catch (err) {
    console.error('POST /api/production-workers unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
