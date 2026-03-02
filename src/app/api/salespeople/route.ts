import { NextRequest, NextResponse } from 'next/server'
import { salespeople } from '@/lib/data'
import type { ErpSalesperson } from '@/types/database'

// GET /api/salespeople — list active salespeople
export async function GET() {
  const active = salespeople.filter((s) => s.active)

  return NextResponse.json({
    data: active,
    count: active.length,
  })
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

    const newSalesperson: ErpSalesperson = {
      id: crypto.randomUUID(),
      user_id: body.user_id || null,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      commission_rate: body.commission_rate,
      active: body.active ?? true,
      created_at: now,
      updated_at: now,
    }

    salespeople.push(newSalesperson)

    return NextResponse.json({ data: newSalesperson }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
