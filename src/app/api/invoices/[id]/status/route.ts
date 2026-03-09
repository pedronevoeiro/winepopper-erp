import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkBlingNfeStatus, mapBlingStatus } from '@/lib/bling-nfe'

/**
 * GET /api/invoices/[id]/status
 * Checks the NF-e status in Bling and updates the local invoice accordingly.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = db()

    // Load invoice
    const { data: invoice, error: invError } = await supabase
      .from('erp_invoices')
      .select('*, sales_order:erp_sales_orders(id, company_id)')
      .eq('id', id)
      .single()

    if (invError || !invoice) {
      return NextResponse.json({ error: 'NF-e nao encontrada.' }, { status: 404 })
    }

    if (invoice.provider !== 'bling' || !invoice.provider_ref) {
      return NextResponse.json(
        { error: 'NF-e nao vinculada ao Bling. Emita a NF-e primeiro.' },
        { status: 400 }
      )
    }

    const companyId = invoice.sales_order?.company_id
    if (!companyId) {
      return NextResponse.json(
        { error: 'Empresa nao identificada no pedido.' },
        { status: 400 }
      )
    }

    const blingId = Number(invoice.provider_ref)
    const blingStatus = await checkBlingNfeStatus(companyId, blingId)
    const erpStatus = mapBlingStatus(blingStatus.situacao)

    // Update invoice if status changed
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (erpStatus !== invoice.status) {
      updates.status = erpStatus
    }

    if (erpStatus === 'authorized') {
      if (blingStatus.chaveAcesso) updates.access_key = blingStatus.chaveAcesso
      if (blingStatus.protocoloAutorizacao) updates.protocol = blingStatus.protocoloAutorizacao
      if (blingStatus.linkXml) updates.xml_url = blingStatus.linkXml
      if (blingStatus.linkDanfe) updates.pdf_url = blingStatus.linkDanfe
      if (blingStatus.numero) updates.number = Number(blingStatus.numero)
      if (!invoice.issue_date) updates.issue_date = new Date().toISOString()
    }

    const { data: updated, error: updateError } = await supabase
      .from('erp_invoices')
      .update(updates)
      .eq('id', id)
      .select('id, status, number, access_key, protocol, xml_url, pdf_url, provider, provider_ref')
      .single()

    if (updateError) {
      console.error('Invoice status update error:', updateError)
    }

    return NextResponse.json({
      data: updated ?? invoice,
      bling: {
        situacao: blingStatus.situacao,
        motivo: blingStatus.motivoSituacao,
      },
    })
  } catch (err) {
    console.error('GET /api/invoices/[id]/status error:', err)
    const message = err instanceof Error ? err.message : 'Erro interno do servidor.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
