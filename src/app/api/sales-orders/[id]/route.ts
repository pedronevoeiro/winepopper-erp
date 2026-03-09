import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpOrderStatus, ErpPaymentMethod } from '@/types/database'

const VALID_STATUSES: ErpOrderStatus[] = [
  'draft',
  'pending',
  'approved',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
]

// PATCH /api/sales-orders/[id] — update order fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = db()

    // Build update payload — only allow known fields
    const allowedFields: Record<string, unknown> = {}

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Status invalido: ${body.status}` },
          { status: 400 }
        )
      }
      allowedFields.status = body.status
    }

    if (body.payment_method !== undefined) {
      allowedFields.payment_method = body.payment_method as ErpPaymentMethod | null
    }

    if (body.installments !== undefined) {
      allowedFields.installments = Number(body.installments)
    }

    if (body.carrier_name !== undefined) {
      allowedFields.carrier_name = body.carrier_name
    }

    if (body.shipping_tracking !== undefined) {
      allowedFields.shipping_tracking = body.shipping_tracking
    }

    if (body.notes !== undefined) {
      allowedFields.notes = body.notes
    }

    if (body.internal_notes !== undefined) {
      allowedFields.internal_notes = body.internal_notes
    }

    if (body.expected_date !== undefined) {
      allowedFields.expected_date = body.expected_date
    }

    if (body.shipping_address !== undefined) {
      allowedFields.shipping_address = body.shipping_address
    }

    if (body.shipping_method !== undefined) {
      allowedFields.shipping_method = body.shipping_method
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo valido para atualizar.' },
        { status: 400 }
      )
    }

    allowedFields.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('erp_sales_orders')
      .update(allowedFields)
      .eq('id', id)
      .select('*, contact:erp_contacts(*), salesperson:erp_salespeople(*), company:erp_companies(*), items:erp_sales_order_items(*)')
      .single()

    if (error) {
      console.error('PATCH /api/sales-orders/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('PATCH /api/sales-orders/[id] unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales-orders/[id] — delete order and its items
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = db()

    // Delete order items first (foreign key constraint)
    const { error: itemsError } = await supabase
      .from('erp_sales_order_items')
      .delete()
      .eq('order_id', id)

    if (itemsError) {
      console.error('DELETE /api/sales-orders/[id] delete items error:', itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Delete the order
    const { error: orderError } = await supabase
      .from('erp_sales_orders')
      .delete()
      .eq('id', id)

    if (orderError) {
      console.error('DELETE /api/sales-orders/[id] delete order error:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/sales-orders/[id] unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
