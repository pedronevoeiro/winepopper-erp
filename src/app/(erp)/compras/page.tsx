'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatBRL, formatDate } from '@/lib/constants'
import {
  Plus,
  ShoppingBag,
  FileText,
  Clock,
  CheckCircle2,
  PackageCheck,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { ErpPurchaseOrderStatus } from '@/types/database'

interface PurchaseOrderItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string | null
  quantity: number
  unit_cost_estimated: number
  quantity_received: number
  total_estimated: number
}

interface PurchaseOrderEnriched {
  id: string
  order_number: number
  supplier_id: string
  supplier_name: string
  status: ErpPurchaseOrderStatus
  expected_date: string | null
  total_estimated: number
  item_count: number
  items: PurchaseOrderItem[]
  notes: string | null
  created_at: string
  updated_at: string
}

export default function ComprasPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PurchaseOrderEnriched[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [receiveOrderId, setReceiveOrderId] = useState<string | null>(null)
  const [receiving, setReceiving] = useState(false)

  function fetchOrders() {
    fetch('/api/purchase-orders')
      .then((r) => r.json())
      .then((json) => setOrders(json.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // KPIs
  const kpis = useMemo(() => {
    const drafts = orders.filter((o) => o.status === 'draft').length
    const sent = orders.filter((o) => o.status === 'sent').length
    const partial = orders.filter((o) => o.status === 'partial').length
    const received = orders.filter((o) => o.status === 'received').length
    const totalPending = orders
      .filter((o) => o.status === 'sent' || o.status === 'partial')
      .reduce((s, o) => s + o.total_estimated, 0)
    return { drafts, sent, partial, received, totalPending }
  }, [orders])

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      })
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== deleteId))
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  async function handleReceiveAll() {
    if (!receiveOrderId) return
    setReceiving(true)
    const order = orders.find((o) => o.id === receiveOrderId)
    if (!order) return

    try {
      const received_items = order.items.map((item) => ({
        item_id: item.id,
        quantity_received: item.quantity,
      }))

      const res = await fetch('/api/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: receiveOrderId, received_items }),
      })

      if (res.ok) {
        fetchOrders()
      }
    } catch {
      // ignore
    } finally {
      setReceiving(false)
      setReceiveOrderId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos de Compra"
        actions={
          <Link href="/compras/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Pedido
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-2xl font-bold">{kpis.drafts}</p>
              <p className="text-xs text-muted-foreground">Rascunhos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{kpis.sent}</p>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <PackageCheck className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{kpis.partial}</p>
              <p className="text-xs text-muted-foreground">Parciais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{kpis.received}</p>
              <p className="text-xs text-muted-foreground">Recebidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ShoppingBag className="h-8 w-8 text-violet-500" />
            <div>
              <p className="text-2xl font-bold">{formatBRL(kpis.totalPending)}</p>
              <p className="text-xs text-muted-foreground">Pendente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum pedido de compra encontrado.</p>
              <Link href="/compras/nova">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Pedido
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead className="text-right">Total Est.</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.supplier_name}
                    </TableCell>
                    <TableCell>
                      {order.expected_date ? formatDate(order.expected_date) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(order.total_estimated)}
                    </TableCell>
                    <TableCell className="text-center">
                      {order.item_count}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} type="purchase_order" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(order.status === 'sent' || order.status === 'partial') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceiveOrderId(order.id)}
                          >
                            <PackageCheck className="mr-1 h-3 w-3" />
                            Receber
                          </Button>
                        )}
                        {(order.status === 'draft' || order.status === 'cancelled') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(order.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Pedido de Compra</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este pedido? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive confirmation dialog */}
      <Dialog open={!!receiveOrderId} onOpenChange={(open) => !open && setReceiveOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber Pedido Completo</DialogTitle>
            <DialogDescription>
              Confirma o recebimento de todos os itens deste pedido? O estoque dos insumos sera atualizado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOrderId(null)}>
              Cancelar
            </Button>
            <Button onClick={handleReceiveAll} disabled={receiving}>
              {receiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
