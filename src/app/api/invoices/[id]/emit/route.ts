import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  findOrCreateBlingContact,
  findBlingProductBySku,
  createBlingNfe,
  submitBlingNfe,
  isBlingConnected,
} from '@/lib/bling-nfe'

/**
 * POST /api/invoices/[id]/emit
 * Emits the NF-e via Bling:
 *  1. Loads the invoice with items, contact, sales_order
 *  2. Determines company_id from the sales order
 *  3. Checks Bling is connected
 *  4. Finds/creates contact in Bling
 *  5. Resolves product IDs by SKU
 *  6. Creates NF-e in Bling
 *  7. Submits to Sefaz
 *  8. Updates invoice status to 'processing'
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = db()

    // 1. Load invoice
    const { data: invoice, error: invError } = await supabase
      .from('erp_invoices')
      .select('*, contact:erp_contacts(*), sales_order:erp_sales_orders(id, order_number, company_id, shipping_cost)')
      .eq('id', id)
      .single()

    if (invError || !invoice) {
      return NextResponse.json({ error: 'NF-e nao encontrada.' }, { status: 404 })
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: `NF-e com status "${invoice.status}" nao pode ser emitida. Apenas rascunhos podem ser emitidos.` },
        { status: 400 }
      )
    }

    // Load invoice items
    const { data: items } = await supabase
      .from('erp_invoice_items')
      .select('*')
      .eq('invoice_id', id)

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'NF-e sem itens. Adicione itens antes de emitir.' },
        { status: 400 }
      )
    }

    // 2. Determine company_id
    const companyId = invoice.sales_order?.company_id
    if (!companyId) {
      return NextResponse.json(
        { error: 'Pedido de venda sem empresa vinculada. Defina a empresa no pedido.' },
        { status: 400 }
      )
    }

    // 3. Check Bling connected
    const connected = await isBlingConnected(companyId)
    if (!connected) {
      return NextResponse.json(
        { error: 'Bling nao conectado para esta empresa. Acesse Configuracoes > Integracoes para conectar.' },
        { status: 400 }
      )
    }

    // 4. Find/create contact in Bling
    const contact = invoice.contact
    if (!contact) {
      return NextResponse.json(
        { error: 'NF-e sem destinatario. Vincule um contato.' },
        { status: 400 }
      )
    }

    const blingContatoId = await findOrCreateBlingContact(companyId, {
      name: contact.name,
      document: contact.document,
      personType: contact.person_type as 'PF' | 'PJ',
      email: contact.email,
      phone: contact.phone || contact.mobile,
      stateReg: contact.state_reg,
    })

    // 5. Resolve product IDs by SKU
    const blingItems = await Promise.all(
      items.map(async (item) => {
        let blingProdutoId: number | undefined
        if (item.sku) {
          const found = await findBlingProductBySku(companyId, item.sku)
          if (found) blingProdutoId = found
        }

        return {
          blingProdutoId,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          cfop: item.cfop,
          ncm: item.ncm,
        }
      })
    )

    // 6. Create NF-e in Bling
    const shipping = invoice.total_shipping ?? invoice.sales_order?.shipping_cost ?? 0
    const { blingId } = await createBlingNfe(companyId, {
      contatoId: blingContatoId,
      items: blingItems,
      frete: shipping,
      fretePorConta: shipping > 0 ? 1 : 9,
    })

    // 7. Submit to Sefaz
    await submitBlingNfe(companyId, blingId)

    // 8. Update invoice
    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('erp_invoices')
      .update({
        status: 'processing',
        provider: 'bling',
        provider_ref: String(blingId),
        updated_at: now,
      })
      .eq('id', id)
      .select('id, status, provider, provider_ref')
      .single()

    if (updateError) {
      console.error('Invoice update error after Bling submit:', updateError)
      // NF-e was already submitted — return success with warning
      return NextResponse.json({
        data: { id, status: 'processing', provider: 'bling', provider_ref: String(blingId) },
        warning: 'NF-e enviada ao Bling, mas houve erro ao atualizar o banco local.',
      })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('POST /api/invoices/[id]/emit error:', err)
    const message = err instanceof Error ? err.message : 'Erro interno do servidor.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
