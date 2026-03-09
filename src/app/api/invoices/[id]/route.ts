import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpInvoiceStatus } from '@/types/database'

const VALID_STATUSES: ErpInvoiceStatus[] = ['draft', 'processing', 'authorized', 'cancelled', 'denied']

// GET /api/invoices/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = db()

    const { data: invoice, error } = await supabase
      .from('erp_invoices')
      .select('*, contact:erp_contacts(*), sales_order:erp_sales_orders(id, order_number, status, total, subtotal, discount_value, shipping_cost)')
      .eq('id', id)
      .single()

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'NF-e não encontrada.' },
        { status: 404 }
      )
    }

    // Fetch invoice items
    const { data: items } = await supabase
      .from('erp_invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      data: {
        ...invoice,
        items: items ?? [],
      },
    })
  } catch (err) {
    console.error('GET /api/invoices/[id] unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/[id] — update invoice fields or status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = db()

    // Fetch current invoice
    const { data: current, error: fetchError } = await supabase
      .from('erp_invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'NF-e não encontrada.' },
        { status: 404 }
      )
    }

    const allowedFields: Record<string, unknown> = {}

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Status inválido: ${body.status}` },
          { status: 400 }
        )
      }
      allowedFields.status = body.status

      // When status changes to 'authorized', set issue_date if not set
      if (body.status === 'authorized' && !current.issue_date && !body.issue_date) {
        allowedFields.issue_date = new Date().toISOString()
      }
    }

    if (body.number !== undefined) allowedFields.number = body.number
    if (body.series !== undefined) allowedFields.series = body.series
    if (body.access_key !== undefined) allowedFields.access_key = body.access_key
    if (body.protocol !== undefined) allowedFields.protocol = body.protocol
    if (body.xml_url !== undefined) allowedFields.xml_url = body.xml_url
    if (body.pdf_url !== undefined) allowedFields.pdf_url = body.pdf_url
    if (body.issue_date !== undefined) allowedFields.issue_date = body.issue_date
    if (body.notes !== undefined) allowedFields.notes = body.notes

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualizar.' },
        { status: 400 }
      )
    }

    allowedFields.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('erp_invoices')
      .update(allowedFields)
      .eq('id', id)
      .select('*, contact:erp_contacts(*), sales_order:erp_sales_orders(id, order_number, status, total)')
      .single()

    if (error) {
      console.error('PATCH /api/invoices/[id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('PATCH /api/invoices/[id] unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/[id] — only allow deleting draft invoices
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = db()

    // Check invoice status
    const { data: invoice, error: fetchError } = await supabase
      .from('erp_invoices')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'NF-e não encontrada.' },
        { status: 404 }
      )
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Somente NF-e em rascunho pode ser excluída.' },
        { status: 400 }
      )
    }

    // Delete items first (foreign key)
    const { error: itemsError } = await supabase
      .from('erp_invoice_items')
      .delete()
      .eq('invoice_id', id)

    if (itemsError) {
      console.error('DELETE /api/invoices/[id] delete items error:', itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Delete invoice
    const { error: deleteError } = await supabase
      .from('erp_invoices')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('DELETE /api/invoices/[id] delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/invoices/[id] unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
