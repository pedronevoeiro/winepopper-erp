'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  formatBRL,
  formatDate,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
} from '@/lib/constants'
import {
  Plus,
  FileText,
  Loader2,
  CheckCircle2,
  FileWarning,
  XCircle,
  Files,
} from 'lucide-react'
import type { ErpInvoiceStatus, ErpInvoiceDirection } from '@/types/database'

interface InvoiceRow {
  id: string
  direction: ErpInvoiceDirection
  status: ErpInvoiceStatus
  number: number | null
  series: number
  total: number
  issue_date: string | null
  created_at: string
  contact?: { id: string; name: string; document: string } | null
  sales_order?: { id: string; order_number: number } | null
}

interface SalesOrderOption {
  id: string
  order_number: number
  status: string
  total: number
  contact?: { name: string } | null
}

interface InvoiceSummary {
  total: number
  draft: number
  processing: number
  authorized: number
  cancelled: number
  denied: number
}

const ALL_STATUSES: (ErpInvoiceStatus | 'all')[] = [
  'all',
  'draft',
  'processing',
  'authorized',
  'cancelled',
  'denied',
]

export default function FiscalPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<InvoiceSummary>({
    total: 0,
    draft: 0,
    processing: 0,
    authorized: 0,
    cancelled: 0,
    denied: 0,
  })

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [directionFilter, setDirectionFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [availableOrders, setAvailableOrders] = useState<SalesOrderOption[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  function fetchInvoices() {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (directionFilter !== 'all') params.set('direction', directionFilter)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)

    fetch(`/api/invoices?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        setInvoices(json.data ?? [])
        if (json.summary) setSummary(json.summary)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, directionFilter, dateFrom, dateTo])

  // Fetch available orders when dialog opens
  useEffect(() => {
    if (!dialogOpen) return
    setLoadingOrders(true)
    setSelectedOrderId('')
    setCreateError(null)

    fetch('/api/sales-orders')
      .then((res) => res.json())
      .then((json) => {
        const orders = json.data ?? []
        // Filter: approved or later, not draft/pending/cancelled
        const validStatuses = ['approved', 'in_production', 'ready', 'shipped', 'delivered']
        const eligible = orders.filter(
          (o: SalesOrderOption) => validStatuses.includes(o.status)
        )
        setAvailableOrders(eligible)
      })
      .catch(console.error)
      .finally(() => setLoadingOrders(false))
  }, [dialogOpen])

  const selectedOrder = useMemo(
    () => availableOrders.find((o) => o.id === selectedOrderId) ?? null,
    [availableOrders, selectedOrderId]
  )

  async function handleCreate() {
    if (!selectedOrderId) return
    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales_order_id: selectedOrderId }),
      })

      const json = await res.json()

      if (res.ok) {
        setDialogOpen(false)
        fetchInvoices()
        // Navigate to the new invoice
        if (json.data?.id) {
          router.push(`/fiscal/${json.data.id}`)
        }
      } else {
        setCreateError(json.error || 'Erro ao criar NF-e.')
      }
    } catch {
      setCreateError('Erro de conexão. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiscal / NF-e"
        description="Emissão e gestão de notas fiscais eletrônicas"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova NF-e
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nova NF-e</DialogTitle>
                <DialogDescription>
                  Selecione um pedido aprovado para gerar a nota fiscal.
                </DialogDescription>
              </DialogHeader>

              {loadingOrders ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : availableOrders.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum pedido aprovado disponível para gerar NF-e.
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pedido de Venda</label>
                    <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um pedido..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOrders.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            #{o.order_number} — {o.contact?.name ?? 'Sem cliente'} — {formatBRL(o.total)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedOrder && (
                    <Card>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pedido</span>
                          <span className="font-medium">#{selectedOrder.order_number}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cliente</span>
                          <span className="font-medium">{selectedOrder.contact?.name ?? '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-bold">{formatBRL(selectedOrder.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {createError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {createError}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!selectedOrderId || creating}
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar NF-e
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de NF-e</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Files className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{summary.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Autorizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{summary.authorized}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Rascunho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-gray-500" />
              <span className="text-2xl font-bold">{summary.draft}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas / Rejeitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{summary.cancelled + summary.denied}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'Todos' : INVOICE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Direção:</span>
          {(['all', 'outgoing', 'incoming'] as const).map((d) => (
            <Button
              key={d}
              variant={directionFilter === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDirectionFilter(d)}
            >
              {d === 'all' ? 'Todas' : d === 'outgoing' ? 'Saída' : 'Entrada'}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">De:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Até:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhuma nota fiscal encontrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter !== 'all'
                ? 'Tente mudar o filtro de status.'
                : 'Crie sua primeira NF-e clicando no botão acima.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Direção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/fiscal/${inv.id}`)}
                  >
                    <TableCell className="font-medium">
                      {inv.number ?? '-'}
                    </TableCell>
                    <TableCell>{inv.series}</TableCell>
                    <TableCell>
                      {inv.issue_date ? formatDate(inv.issue_date) : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} type="invoice" />
                    </TableCell>
                    <TableCell>{inv.contact?.name ?? '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(inv.total)}
                    </TableCell>
                    <TableCell>
                      {inv.sales_order ? `#${inv.sales_order.order_number}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {inv.direction === 'outgoing' ? 'Saída' : 'Entrada'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
