/**
 * Bling API v3 — Importacao de dados do Bling para o ERP
 *
 * Usa o mesmo sistema OAuth2 multi-company do bling-nfe.ts.
 * Cada funcao busca dados paginados da API Bling e faz upsert no Supabase.
 */

import { db } from '@/lib/db'
import { getAccessToken } from '@/lib/bling-nfe'

const BLING_API = 'https://api.bling.com.br/Api/v3'
const PAGE_SIZE = 100

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportResult {
  module: string
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// Generic paginated fetch
// ---------------------------------------------------------------------------

async function fetchAllPages<T>(
  token: string,
  endpoint: string,
  dataKey = 'data'
): Promise<T[]> {
  const all: T[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${BLING_API}${endpoint}${separator}pagina=${page}&limite=${PAGE_SIZE}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      if (res.status === 429) {
        // Rate limit — wait and retry
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      break
    }

    const json = await res.json()
    const items = json[dataKey] ?? json.data ?? []

    if (!Array.isArray(items) || items.length === 0) {
      hasMore = false
    } else {
      all.push(...items)
      if (items.length < PAGE_SIZE) {
        hasMore = false
      } else {
        page++
      }
    }

    // Bling rate limit: ~3 req/s
    await new Promise((r) => setTimeout(r, 350))
  }

  return all
}

// ---------------------------------------------------------------------------
// Import Contacts
// ---------------------------------------------------------------------------

export async function importContacts(companyId: string): Promise<ImportResult> {
  const result: ImportResult = { module: 'contacts', created: 0, updated: 0, skipped: 0, errors: [] }
  const token = await getAccessToken(companyId)
  const supabase = db()

  const contacts = await fetchAllPages<Record<string, unknown>>(token, '/contatos')

  for (const c of contacts) {
    try {
      const blingId = c.id as number
      const doc = ((c.numeroDocumento as string) || '').replace(/\D/g, '')

      if (!doc) {
        result.skipped++
        continue
      }

      const tipo = (c.tipo as string) === 'J' ? 'PJ' : 'PF'
      const contactType = c.cliente === true && c.fornecedor === true
        ? 'both'
        : c.fornecedor === true
          ? 'supplier'
          : 'customer'

      const endereco = (c.endereco as Record<string, unknown>) ?? {}

      const record = {
        type: contactType,
        person_type: tipo,
        name: (c.nome as string) || 'Sem nome',
        trade_name: (c.fantasia as string) || null,
        document: doc,
        state_reg: ((c.ie as string) || '').replace(/\D/g, '') || null,
        email: (c.email as string) || null,
        phone: (c.fone as string) || (c.telefone as string) || null,
        mobile: (c.celular as string) || null,
        cep: (endereco.cep as string) || null,
        street: (endereco.endereco as string) || null,
        number: (endereco.numero as string) || null,
        complement: (endereco.complemento as string) || null,
        neighborhood: (endereco.bairro as string) || null,
        city: (endereco.municipio as string) || (endereco.cidade as string) || null,
        state: (endereco.uf as string) || null,
        ibge_code: (endereco.codigoMunicipio as string) || null,
        bling_id: blingId,
        active: (c.situacao as string) !== 'I',
      }

      // Try upsert by bling_id first, then by document
      const { data: existing } = await supabase
        .from('erp_contacts')
        .select('id')
        .eq('bling_id', blingId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('erp_contacts')
          .update({ ...record, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        result.updated++
      } else {
        // Check by document
        const { data: byDoc } = await supabase
          .from('erp_contacts')
          .select('id')
          .eq('document', doc)
          .maybeSingle()

        if (byDoc) {
          await supabase
            .from('erp_contacts')
            .update({ ...record, updated_at: new Date().toISOString() })
            .eq('id', byDoc.id)
          result.updated++
        } else {
          await supabase.from('erp_contacts').insert(record)
          result.created++
        }
      }
    } catch (err) {
      result.errors.push(`Contato ${c.nome}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Import Products
// ---------------------------------------------------------------------------

export async function importProducts(companyId: string): Promise<ImportResult> {
  const result: ImportResult = { module: 'products', created: 0, updated: 0, skipped: 0, errors: [] }
  const token = await getAccessToken(companyId)
  const supabase = db()

  const products = await fetchAllPages<Record<string, unknown>>(token, '/produtos')

  for (const p of products) {
    try {
      const blingId = p.id as number
      const sku = (p.codigo as string) || `BLING-${blingId}`

      const record = {
        sku,
        name: (p.nome as string) || (p.descricao as string) || 'Sem nome',
        description: (p.descricaoCurta as string) || (p.descricao as string) || null,
        cost_price: Number(p.precoCusto) || 0,
        sell_price: Number(p.preco) || 0,
        weight_grams: Math.round((Number(p.pesoBruto) || 0) * 1000),
        ncm: (p.ncm as string) || null,
        cest: (p.cest as string) || null,
        origin: Number(p.origem) || 0,
        height_cm: Number((p.dimensoes as Record<string, unknown>)?.altura ?? p.altura) || 0,
        width_cm: Number((p.dimensoes as Record<string, unknown>)?.largura ?? p.largura) || 0,
        length_cm: Number((p.dimensoes as Record<string, unknown>)?.profundidade ?? p.profundidade) || 0,
        bling_id: blingId,
        active: (p.situacao as string) !== 'I',
      }

      const { data: existing } = await supabase
        .from('erp_products')
        .select('id')
        .eq('bling_id', blingId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('erp_products')
          .update({ ...record, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        result.updated++
      } else {
        // Check by SKU
        const { data: bySku } = await supabase
          .from('erp_products')
          .select('id')
          .eq('sku', sku)
          .maybeSingle()

        if (bySku) {
          await supabase
            .from('erp_products')
            .update({ ...record, updated_at: new Date().toISOString() })
            .eq('id', bySku.id)
          result.updated++
        } else {
          await supabase.from('erp_products').insert(record)
          result.created++
        }
      }
    } catch (err) {
      result.errors.push(`Produto ${p.nome}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Import Stock
// ---------------------------------------------------------------------------

export async function importStock(companyId: string): Promise<ImportResult> {
  const result: ImportResult = { module: 'stock', created: 0, updated: 0, skipped: 0, errors: [] }
  const token = await getAccessToken(companyId)
  const supabase = db()

  // Get default warehouse
  const { data: warehouses } = await supabase
    .from('erp_warehouses')
    .select('id')
    .eq('active', true)
    .limit(1)

  const warehouseId = warehouses?.[0]?.id
  if (!warehouseId) {
    result.errors.push('Nenhum deposito cadastrado. Crie um deposito antes de importar estoque.')
    return result
  }

  const stockData = await fetchAllPages<Record<string, unknown>>(token, '/estoques/saldos')

  for (const s of stockData) {
    try {
      const produtoData = (s.produto as Record<string, unknown>) ?? s
      const blingProdutoId = (produtoData.id as number) || (s.produto_id as number)
      const saldo = Number(s.saldoFisicoTotal ?? s.saldoFisico ?? s.quantidade ?? 0)

      if (!blingProdutoId) {
        result.skipped++
        continue
      }

      // Find product by bling_id
      const { data: product } = await supabase
        .from('erp_products')
        .select('id')
        .eq('bling_id', blingProdutoId)
        .maybeSingle()

      if (!product) {
        result.skipped++
        continue
      }

      // Upsert stock
      const { data: existingStock } = await supabase
        .from('erp_stock')
        .select('id')
        .eq('product_id', product.id)
        .eq('warehouse_id', warehouseId)
        .eq('company_id', companyId)
        .is('variation_id', null)
        .maybeSingle()

      if (existingStock) {
        await supabase
          .from('erp_stock')
          .update({ quantity: saldo })
          .eq('id', existingStock.id)
        result.updated++
      } else {
        await supabase.from('erp_stock').insert({
          product_id: product.id,
          warehouse_id: warehouseId,
          company_id: companyId,
          quantity: saldo,
          reserved: 0,
          min_quantity: 0,
        })
        result.created++
      }
    } catch (err) {
      result.errors.push(`Estoque: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Import Sales Orders
// ---------------------------------------------------------------------------

function mapBlingOrderStatus(situacao: number | string): string {
  const sit = Number(situacao)
  switch (sit) {
    case 0: return 'draft'
    case 1: case 2: case 3: return 'pending'
    case 4: case 5: return 'approved'
    case 6: case 7: return 'shipped'
    case 8: return 'delivered'
    case 9: return 'cancelled'
    case 10: return 'returned'
    default: return 'pending'
  }
}

export async function importSalesOrders(companyId: string): Promise<ImportResult> {
  const result: ImportResult = { module: 'sales_orders', created: 0, updated: 0, skipped: 0, errors: [] }
  const token = await getAccessToken(companyId)
  const supabase = db()

  const orders = await fetchAllPages<Record<string, unknown>>(token, '/pedidos/vendas')

  for (const o of orders) {
    try {
      const blingId = o.id as number

      // Check if already imported
      const { data: existing } = await supabase
        .from('erp_sales_orders')
        .select('id')
        .eq('bling_id', blingId)
        .maybeSingle()

      if (existing) {
        result.skipped++
        continue
      }

      // Find contact
      const contato = (o.contato as Record<string, unknown>) ?? {}
      const contatoDoc = ((contato.numeroDocumento as string) || '').replace(/\D/g, '')
      let contactId: string | null = null

      if (contatoDoc) {
        const { data: contact } = await supabase
          .from('erp_contacts')
          .select('id')
          .eq('document', contatoDoc)
          .maybeSingle()
        contactId = contact?.id ?? null
      }

      if (!contactId) {
        // Create minimal contact
        const { data: newContact } = await supabase
          .from('erp_contacts')
          .insert({
            name: (contato.nome as string) || 'Importado Bling',
            document: contatoDoc || `BLING-${blingId}`,
            type: 'customer',
            person_type: contatoDoc.length > 11 ? 'PJ' : 'PF',
          })
          .select('id')
          .single()
        contactId = newContact?.id ?? null
      }

      if (!contactId) {
        result.errors.push(`Pedido #${o.numero}: contato nao encontrado`)
        continue
      }

      const totalProdutos = Number(o.totalProdutos) || 0
      const transporte = (o.transporte as Record<string, unknown>) ?? {}
      const frete = Number(transporte.fretePorConta === 0 ? transporte.valorFrete : o.frete) || 0
      const descontoObj = (o.desconto as Record<string, unknown>) ?? {}
      const desconto = Number(descontoObj.valor) || 0

      const { data: newOrder } = await supabase
        .from('erp_sales_orders')
        .insert({
          contact_id: contactId,
          company_id: companyId,
          status: mapBlingOrderStatus(o.situacao as number),
          order_date: (o.data as string) || new Date().toISOString().split('T')[0],
          subtotal: totalProdutos,
          discount_value: desconto,
          shipping_cost: frete,
          total: Number(o.totalVenda ?? o.total) || totalProdutos + frete - desconto,
          bling_id: blingId,
          notes: (o.observacoes as string) || null,
          internal_notes: (o.observacoesInternas as string) || null,
        })
        .select('id')
        .single()

      if (!newOrder) {
        result.errors.push(`Pedido #${o.numero}: erro ao inserir`)
        continue
      }

      // Fetch order detail for items
      const detailRes = await fetch(`${BLING_API}/pedidos/vendas/${blingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (detailRes.ok) {
        const detailJson = await detailRes.json()
        const items = detailJson.data?.itens ?? []

        for (const item of items) {
          const itemBlingProdId = item.produto?.id ?? item.id
          let productId: string | null = null

          if (itemBlingProdId) {
            const { data: prod } = await supabase
              .from('erp_products')
              .select('id')
              .eq('bling_id', itemBlingProdId)
              .maybeSingle()
            productId = prod?.id ?? null
          }

          if (!productId) {
            // Create placeholder product
            const sku = (item.produto?.codigo as string) || `BLING-ITEM-${itemBlingProdId}`
            const { data: newProd } = await supabase
              .from('erp_products')
              .insert({
                sku,
                name: (item.descricao as string) || 'Produto importado',
                bling_id: itemBlingProdId || null,
              })
              .select('id')
              .single()
            productId = newProd?.id ?? null
          }

          if (productId) {
            const qty = Number(item.quantidade) || 1
            const unitPrice = Number(item.valor ?? item.valorUnidade) || 0
            await supabase.from('erp_sales_order_items').insert({
              order_id: newOrder.id,
              product_id: productId,
              description: (item.descricao as string) || 'Item importado',
              sku: (item.produto?.codigo as string) || null,
              quantity: qty,
              unit_price: unitPrice,
              total: qty * unitPrice,
            })
          }
        }

        // Rate limit
        await new Promise((r) => setTimeout(r, 350))
      }

      result.created++
    } catch (err) {
      result.errors.push(`Pedido ${o.numero}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Import Financial (Contas a Receber + Pagar)
// ---------------------------------------------------------------------------

export async function importFinancial(companyId: string): Promise<ImportResult> {
  const result: ImportResult = { module: 'financial', created: 0, updated: 0, skipped: 0, errors: [] }
  const token = await getAccessToken(companyId)
  const supabase = db()

  // Import both receivable and payable
  for (const tipo of ['receber', 'pagar'] as const) {
    const entries = await fetchAllPages<Record<string, unknown>>(token, `/contas/${tipo}`)
    const erpType = tipo === 'receber' ? 'receivable' : 'payable'

    for (const e of entries) {
      try {
        const blingId = e.id as number

        const { data: existing } = await supabase
          .from('erp_financial_entries')
          .select('id')
          .eq('bling_id', blingId)
          .maybeSingle()

        if (existing) {
          result.skipped++
          continue
        }

        // Find contact
        let contactId: string | null = null
        const contato = (e.contato as Record<string, unknown>) ?? {}
        const contatoDoc = ((contato.numeroDocumento as string) || '').replace(/\D/g, '')

        if (contatoDoc) {
          const { data: contact } = await supabase
            .from('erp_contacts')
            .select('id')
            .eq('document', contatoDoc)
            .maybeSingle()
          contactId = contact?.id ?? null
        }

        const valor = Number(e.valor) || 0
        const valorPago = Number(e.valorPago ?? e.saldo) || 0
        const vencimento = (e.vencimento as string) || new Date().toISOString().split('T')[0]
        const dataPagamento = (e.dataPagamento as string) || null

        let status: string = 'open'
        const sit = (e.situacao as number) || 0
        if (sit === 1) status = 'open'
        else if (sit === 2) status = 'paid'
        else if (sit === 3) status = 'partial'
        else if (sit === 4) status = 'cancelled'
        else if (sit === 5) status = 'overdue'

        await supabase.from('erp_financial_entries').insert({
          type: erpType,
          status,
          contact_id: contactId,
          company_id: companyId,
          description: (e.historico as string) || (e.descricao as string) || `Importado Bling #${blingId}`,
          amount: valor,
          paid_amount: valorPago,
          due_date: vencimento,
          payment_date: dataPagamento,
          category: (e.categoria as string) || null,
          bling_id: blingId,
          notes: (e.observacoes as string) || null,
        })

        result.created++
      } catch (err) {
        result.errors.push(`Financeiro ${e.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Import NF-e (Invoices)
// ---------------------------------------------------------------------------

export async function importInvoices(companyId: string): Promise<ImportResult> {
  const result: ImportResult = { module: 'invoices', created: 0, updated: 0, skipped: 0, errors: [] }
  const token = await getAccessToken(companyId)
  const supabase = db()

  const nfes = await fetchAllPages<Record<string, unknown>>(token, '/nfe')

  for (const nfe of nfes) {
    try {
      const blingId = nfe.id as number

      const { data: existing } = await supabase
        .from('erp_invoices')
        .select('id')
        .eq('bling_id', blingId)
        .maybeSingle()

      if (existing) {
        result.skipped++
        continue
      }

      const sit = Number(nfe.situacao) || 0
      let status: string = 'draft'
      if (sit === 5 || sit === 6) status = 'authorized'
      else if (sit === 2) status = 'cancelled'
      else if (sit === 4 || sit === 7) status = 'denied'
      else if (sit === 1 || sit === 3) status = 'processing'

      const tipo = Number(nfe.tipo) || 1
      const direction = tipo === 0 ? 'incoming' : 'outgoing'

      // Find related sales order by bling pedido
      let salesOrderId: string | null = null
      const pedido = (nfe.pedidoVenda as Record<string, unknown>) ?? {}
      const pedidoBlingId = pedido.id as number | undefined

      if (pedidoBlingId) {
        const { data: order } = await supabase
          .from('erp_sales_orders')
          .select('id')
          .eq('bling_id', pedidoBlingId)
          .maybeSingle()
        salesOrderId = order?.id ?? null
      }

      // Find contact
      let contactId: string | null = null
      const contato = (nfe.contato as Record<string, unknown>) ?? {}
      const contatoDoc = ((contato.numeroDocumento as string) || '').replace(/\D/g, '')

      if (contatoDoc) {
        const { data: contact } = await supabase
          .from('erp_contacts')
          .select('id')
          .eq('document', contatoDoc)
          .maybeSingle()
        contactId = contact?.id ?? null
      }

      await supabase.from('erp_invoices').insert({
        direction,
        status,
        number: Number(nfe.numero) || null,
        series: Number(nfe.serie) || 1,
        access_key: (nfe.chaveAcesso as string) || null,
        protocol: (nfe.protocoloAutorizacao as string) || null,
        sales_order_id: salesOrderId,
        contact_id: contactId,
        company_id: companyId,
        total_products: Number(nfe.valorProdutos ?? nfe.totalProdutos) || 0,
        total_shipping: Number(nfe.valorFrete ?? nfe.frete) || 0,
        total: Number(nfe.valorNota ?? nfe.total) || 0,
        provider: 'bling',
        provider_ref: String(blingId),
        xml_url: (nfe.linkXml as string) || null,
        pdf_url: (nfe.linkDanfe as string) || null,
        bling_id: blingId,
        issue_date: (nfe.dataEmissao as string) || null,
      })

      result.created++
    } catch (err) {
      result.errors.push(`NF-e ${nfe.numero}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Main import orchestrator
// ---------------------------------------------------------------------------

export type ImportModule = 'contacts' | 'products' | 'stock' | 'sales_orders' | 'financial' | 'invoices'

export async function runImport(
  companyId: string,
  modules: ImportModule[]
): Promise<ImportResult[]> {
  const results: ImportResult[] = []

  for (const mod of modules) {
    switch (mod) {
      case 'contacts':
        results.push(await importContacts(companyId))
        break
      case 'products':
        results.push(await importProducts(companyId))
        break
      case 'stock':
        results.push(await importStock(companyId))
        break
      case 'sales_orders':
        results.push(await importSalesOrders(companyId))
        break
      case 'financial':
        results.push(await importFinancial(companyId))
        break
      case 'invoices':
        results.push(await importInvoices(companyId))
        break
    }
  }

  return results
}
