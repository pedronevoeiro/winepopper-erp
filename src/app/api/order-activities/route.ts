import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/order-activities?order_id=xxx — list activities for an order
export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('order_id')
    if (!orderId) {
      return NextResponse.json({ error: 'order_id e obrigatorio.' }, { status: 400 })
    }

    const { data, error } = await db()
      .from('erp_order_activities')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/order-activities error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

// POST /api/order-activities — log an activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, action, details, created_by } = body

    if (!order_id || !action) {
      return NextResponse.json({ error: 'order_id e action sao obrigatorios.' }, { status: 400 })
    }

    const { data, error } = await db()
      .from('erp_order_activities')
      .insert({
        order_id,
        action,
        details: details || {},
        created_by: created_by || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/order-activities error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
