import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/order-tags — list all tags, optionally with assignments for an order
export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('order_id')
    const supabase = db()

    // Fetch all active tags
    const { data: tags, error } = await supabase
      .from('erp_order_tags')
      .select('*')
      .eq('active', true)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If order_id provided, also fetch assignments
    if (orderId) {
      const { data: assignments } = await supabase
        .from('erp_order_tag_assignments')
        .select('tag_id')
        .eq('order_id', orderId)

      const assignedIds = new Set((assignments ?? []).map((a: { tag_id: string }) => a.tag_id))
      const enriched = (tags ?? []).map((t: { id: string }) => ({
        ...t,
        assigned: assignedIds.has(t.id),
      }))
      return NextResponse.json({ data: enriched })
    }

    return NextResponse.json({ data: tags ?? [] })
  } catch (err) {
    console.error('GET /api/order-tags error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

// POST /api/order-tags — create a new tag OR toggle assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    // Toggle assignment: { order_id, tag_id }
    if (body.order_id && body.tag_id) {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('erp_order_tag_assignments')
        .select('id')
        .eq('order_id', body.order_id)
        .eq('tag_id', body.tag_id)
        .maybeSingle()

      if (existing) {
        // Remove assignment
        await supabase
          .from('erp_order_tag_assignments')
          .delete()
          .eq('id', existing.id)
        return NextResponse.json({ data: null, action: 'removed' })
      }

      // Add assignment
      const { data, error } = await supabase
        .from('erp_order_tag_assignments')
        .insert({ order_id: body.order_id, tag_id: body.tag_id })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data, action: 'added' }, { status: 201 })
    }

    // Create new tag: { name, color }
    if (body.name) {
      const { data, error } = await supabase
        .from('erp_order_tags')
        .insert({ name: body.name.trim(), color: body.color || '#6b7280' })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Tag ja existe.' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data }, { status: 201 })
    }

    return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })
  } catch (err) {
    console.error('POST /api/order-tags error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

// DELETE /api/order-tags?id=xxx — soft delete a tag
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id e obrigatorio.' }, { status: 400 })
    }

    const { error } = await db()
      .from('erp_order_tags')
      .update({ active: false })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/order-tags error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
