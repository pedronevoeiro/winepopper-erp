'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatDocument,
  INVOICE_STATUS_LABELS,
} from '@/lib/constants'
import {
  ArrowLeft,
  Loader2,
  Trash2,
  FileText,
  User,
  DollarSign,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react'
import type { ErpInvoiceStatus } from '@/types/database'

interface InvoiceDetail {
  id: string
  direction: string
  status: ErpInvoiceStatus
  number: number | null
  series: number
  access_key: string | null
  protocol: string | null
  total_products: number
  total_shipping: number
  total_discount: number
  total_tax: number
  total: number
  provider: string
  provider_ref: string | null
  xml_url: string | null
  pdf_url: string | null
  issue_date: string | null
  created_at: string
  updated_at: string
  contact?: {
    id: string
    name: string
    document: string
    email: string | null
    phone: string | null
    mobile: string | null
    person_type: string
    cep: string | null
    street: string | null
    number: string | null
    complement: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
  } | null
  sales_order?: {
    id: string
    order_number: number
    status: string
    total: number
  } | null
  items?: InvoiceItem[]
}

interface InvoiceItem {
  id: string
  product_id: string
  description: string
  sku: string | null
  quantity: number
  unit_price: number
  discount_pct: number
  total: number
  ncm: string | null
  cfop: string | null
}

export default function FiscalDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Editable fields (for draft)
  const [editNumber, setEditNumber] = useState<string>('')
  const [editSeries, setEditSeries] = useState<string>('1')

  const inputClassName =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none'

  function populateEditFields(inv: InvoiceDetail) {
    setEditNumber(inv.number?.toString() ?? '')
    setEditSeries(inv.series?.toString() ?? '1')
  }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/invoices/${id}`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? null
        setInvoice(data)
        if (data) populateEditFields(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleStatusChange(newStatus: ErpInvoiceStatus) {
    setActionLoading(true)
    setMessage(null)

    try {
      const body: Record<string, unknown> = { status: newStatus }

      // Save editable fields when processing
      if (invoice?.status === 'draft') {
        if (editNumber) body.number = Number(editNumber)
        body.series = Number(editSeries) || 1
      }

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (res.ok) {
        setInvoice((prev) => (prev ? { ...prev, ...json.data, items: prev.items } : prev))
        if (json.data) populateEditFields(json.data)

        const label = INVOICE_STATUS_LABELS[newStatus] ?? newStatus
        setMessage({
          type: 'success',
          text: `Status atualizado para "${label}". Integração com Sefaz será implementada em breve.`,
        })
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({ type: 'error', text: json.error || 'Erro ao atualizar status.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSaveFields() {
    setActionLoading(true)
    setMessage(null)

    try {
      const body: Record<string, unknown> = {}
      if (editNumber) body.number = Number(editNumber)
      body.series = Number(editSeries) || 1

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (res.ok) {
        setInvoice((prev) => (prev ? { ...prev, ...json.data, items: prev.items } : prev))
        if (json.data) populateEditFields(json.data)
        setMessage({ type: 'success', text: 'NF-e atualizada com sucesso.' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: json.error || 'Erro ao salvar.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })

      if (res.ok) {
        router.push('/fiscal')
      } else {
        const json = await res.json()
        setMessage({ type: 'error', text: json.error || 'Erro ao excluir NF-e.' })
        setShowDeleteConfirm(false)
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' })
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="NF-e não encontrada" />
        <p className="text-muted-foreground">A nota fiscal solicitada não foi encontrada.</p>
        <Link href="/fiscal">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
    )
  }

  const contact = invoice.contact
  const isDraft = invoice.status === 'draft'
  const isProcessing = invoice.status === 'processing'
  const isAuthorized = invoice.status === 'authorized'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`NF-e ${invoice.number ? `#${invoice.number}` : '(sem número)'}`}
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            )}
            <Link href="/fiscal">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        }
      />

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-800">
                  Tem certeza que deseja excluir esta NF-e?
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Confirmar Exclusão
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {message && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Status actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status atual:</span>
              <StatusBadge status={invoice.status} type="invoice" />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {isDraft && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('processing')}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Processar
                </Button>
              )}

              {isProcessing && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('authorized')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Autorizar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusChange('denied')}
                    disabled={actionLoading}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </>
              )}

              {isAuthorized && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Cancelar NF-e
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* NF-e data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dados da NF-e
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDraft ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-sm">Número</Label>
                    <input
                      type="number"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      placeholder="Número da NF-e"
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Série</Label>
                    <input
                      type="number"
                      value={editSeries}
                      onChange={(e) => setEditSeries(e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveFields} disabled={actionLoading}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Número</p>
                  <p className="font-medium">{invoice.number ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Série</p>
                  <p className="font-medium">{invoice.series}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={invoice.status} type="invoice" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Emissão</p>
                  <p className="font-medium">
                    {invoice.issue_date ? formatDateTime(invoice.issue_date) : '-'}
                  </p>
                </div>
                {invoice.access_key && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Chave de Acesso</p>
                    <p className="font-mono text-xs break-all">{invoice.access_key}</p>
                  </div>
                )}
                {invoice.protocol && (
                  <div>
                    <p className="text-sm text-muted-foreground">Protocolo</p>
                    <p className="font-medium">{invoice.protocol}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Provedor</p>
                  <p className="font-medium">{invoice.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Direção</p>
                  <p className="font-medium">
                    {invoice.direction === 'outgoing' ? 'Saída' : 'Entrada'}
                  </p>
                </div>
              </div>
            )}

            {/* Links to XML/PDF */}
            {(invoice.xml_url || invoice.pdf_url) && (
              <div className="mt-4 flex gap-3 border-t pt-4">
                {invoice.xml_url && (
                  <a href={invoice.xml_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      XML
                    </Button>
                  </a>
                )}
                {invoice.pdf_url && (
                  <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      PDF (DANFE)
                    </Button>
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Destinatário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contact ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{contact.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documento</p>
                  <p className="font-medium">{formatDocument(contact.document)}</p>
                </div>
                {contact.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{contact.email}</p>
                  </div>
                )}
                {(contact.phone || contact.mobile) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{contact.phone || contact.mobile}</p>
                  </div>
                )}
                {contact.street && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">
                      {contact.street}, {contact.number}
                      {contact.complement ? ` - ${contact.complement}` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.neighborhood} - {contact.city}/{contact.state}
                      {contact.cep ? ` — CEP: ${contact.cep}` : ''}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum destinatário vinculado.</p>
            )}

            {invoice.sales_order && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">Pedido de Venda</p>
                <Link
                  href={`/pedidos/${invoice.sales_order.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  #{invoice.sales_order.order_number} — {formatBRL(invoice.sales_order.total)}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Totals card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Valores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-sm text-muted-foreground">Produtos</p>
              <p className="text-lg font-bold">{formatBRL(invoice.total_products)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Frete</p>
              <p className="text-lg font-bold">{formatBRL(invoice.total_shipping)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Desconto</p>
              <p className="text-lg font-bold text-red-600">-{formatBRL(invoice.total_discount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Impostos</p>
              <p className="text-lg font-bold">{formatBRL(invoice.total_tax)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-primary">{formatBRL(invoice.total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle>Itens da NF-e</CardTitle>
        </CardHeader>
        <CardContent>
          {(invoice.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum item.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>CFOP</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.description || 'Produto'}
                    </TableCell>
                    <TableCell>{item.sku || '-'}</TableCell>
                    <TableCell>{item.ncm || '-'}</TableCell>
                    <TableCell>{item.cfop || '-'}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatBRL(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatBRL(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info about Sefaz integration */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> As ações de processar, autorizar, rejeitar e cancelar atualmente
            apenas alteram o status localmente. A integração com a Sefaz (transmissão real da NF-e)
            será implementada em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
