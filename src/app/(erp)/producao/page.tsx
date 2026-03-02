'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { formatDate } from '@/lib/constants'
import {
  Plus,
  Factory,
  Play,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  CircleCheck,
  Pencil,
} from 'lucide-react'
import type { ErpProductionStatus } from '@/types/database'

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ProductionWorker {
  id: string
  name: string
  role: string | null
}

interface ProductionOrderEnriched {
  id: string
  order_number: number
  status: ErpProductionStatus
  product_id: string
  variation_id: string | null
  quantity: number
  quantity_produced: number
  quantity_lost: number
  warehouse_id: string
  sales_order_id: string | null
  assigned_workers: string[]
  planned_date: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  product_name: string
  product_sku: string | null
  components: {
    component_id: string
    component_name: string
    component_sku: string | null
    required_qty: number
    consumed_qty: number
  }[]
  workers: ProductionWorker[]
}

export default function ProducaoPage() {
  const [orders, setOrders] = useState<ProductionOrderEnriched[]>([])
  const [loading, setLoading] = useState(true)

  // Iniciar dialog state
  const [iniciarOpen, setIniciarOpen] = useState(false)
  const [iniciarOrder, setIniciarOrder] = useState<ProductionOrderEnriched | null>(null)
  const [iniciarStartedAt, setIniciarStartedAt] = useState('')

  // Finalizar dialog state
  const [finalizarOpen, setFinalizarOpen] = useState(false)
  const [finalizarOrder, setFinalizarOrder] = useState<ProductionOrderEnriched | null>(null)
  const [finalizarProduced, setFinalizarProduced] = useState(0)
  const [finalizarLost, setFinalizarLost] = useState(0)
  const [finalizarCompletedAt, setFinalizarCompletedAt] = useState('')

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchOrders = useCallback(() => {
    setLoading(true)
    fetch('/api/production')
      .then((res) => res.json())
      .then((json) => setOrders(Array.isArray(json.data) ? json.data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Summary counts
  const inProgressCount = useMemo(
    () => orders.filter((o) => o.status === 'in_progress').length,
    [orders]
  )
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  )
  const completedThisMonth = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return orders.filter((o) => {
      if (o.status !== 'completed' || !o.completed_at) return false
      const d = new Date(o.completed_at)
      return d.getFullYear() === year && d.getMonth() === month
    }).length
  }, [orders])

  const kpis = [
    {
      title: 'Em Progresso',
      value: inProgressCount,
      icon: Play,
      color: 'text-blue-600',
      description: 'ordens em andamento',
    },
    {
      title: 'Pendentes',
      value: pendingCount,
      icon: Clock,
      color: 'text-yellow-600',
      description: 'aguardando inicio',
    },
    {
      title: 'Concluidas no Mes',
      value: completedThisMonth,
      icon: CircleCheck,
      color: 'text-green-600',
      description: 'finalizadas este mes',
    },
  ]

  // Open iniciar dialog
  function openIniciar(order: ProductionOrderEnriched) {
    setIniciarOrder(order)
    setIniciarStartedAt(toLocalDatetime(new Date().toISOString()))
    setIniciarOpen(true)
  }

  // Action: confirm start production
  async function handleConfirmStart() {
    if (!iniciarOrder) return
    setActionLoading(iniciarOrder.id)
    try {
      const res = await fetch('/api/production', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: iniciarOrder.id,
          status: 'in_progress',
          started_at: iniciarStartedAt ? new Date(iniciarStartedAt).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao iniciar producao')
      }
      setIniciarOpen(false)
      setIniciarOrder(null)
      fetchOrders()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Erro ao iniciar producao')
    } finally {
      setActionLoading(null)
    }
  }

  // Open finalizar dialog
  function openFinalizar(order: ProductionOrderEnriched) {
    setFinalizarOrder(order)
    setFinalizarProduced(order.quantity)
    setFinalizarLost(0)
    setFinalizarCompletedAt(toLocalDatetime(new Date().toISOString()))
    setFinalizarOpen(true)
  }

  // Action: finalizar production
  async function handleFinalizar() {
    if (!finalizarOrder) return
    setActionLoading(finalizarOrder.id)
    try {
      const res = await fetch('/api/production', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: finalizarOrder.id,
          status: 'completed',
          quantity_produced: finalizarProduced,
          quantity_lost: finalizarLost,
          completed_at: finalizarCompletedAt ? new Date(finalizarCompletedAt).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao finalizar producao')
      }
      setFinalizarOpen(false)
      setFinalizarOrder(null)
      fetchOrders()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Erro ao finalizar producao')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordens de Producao"
        description="Gerencie suas ordens de producao"
        actions={
          <Link href="/producao/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Ordem
            </Button>
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders Table */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Factory className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhuma ordem de producao</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie ordens de producao para fabricar produtos a partir de componentes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Produzido</TableHead>
                  <TableHead className="text-right">Perdas</TableHead>
                  <TableHead>Responsaveis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Conclusao</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.product_name}</div>
                      {order.product_sku && (
                        <div className="text-xs text-muted-foreground">
                          {order.product_sku}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {order.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">
                        {order.quantity_produced}/{order.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.quantity_lost > 0 ? (
                        <span className="font-medium text-red-600">
                          {order.quantity_lost}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px] truncate text-sm">
                        {order.workers.length > 0
                          ? order.workers.map((w) => w.name).join(', ')
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} type="production" />
                    </TableCell>
                    <TableCell>
                      {order.started_at ? formatDate(order.started_at) : '-'}
                    </TableCell>
                    <TableCell>
                      {order.completed_at ? formatDate(order.completed_at) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openIniciar(order)}
                            disabled={actionLoading === order.id}
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="mr-1 h-3 w-3" />
                            )}
                            Iniciar
                          </Button>
                        )}
                        {order.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => openFinalizar(order)}
                            disabled={actionLoading === order.id}
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            Finalizar
                          </Button>
                        )}
                        <Link href={`/producao/${order.id}`}>
                          <Button size="sm" variant="ghost" title="Ver / Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Iniciar Dialog */}
      <Dialog open={iniciarOpen} onOpenChange={setIniciarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Ordem de Producao</DialogTitle>
            <DialogDescription>
              {iniciarOrder && (
                <>
                  Ordem #{iniciarOrder.order_number} —{' '}
                  {iniciarOrder.product_name} (meta: {iniciarOrder.quantity} un.)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="iniciar-datetime">Data/Hora de Inicio</Label>
              <Input
                id="iniciar-datetime"
                type="datetime-local"
                value={iniciarStartedAt}
                onChange={(e) => setIniciarStartedAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ajuste a data e hora se o inicio nao for agora.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIniciarOpen(false)}
              disabled={!!actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmStart}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Confirmar Inicio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalizar Dialog */}
      <Dialog open={finalizarOpen} onOpenChange={setFinalizarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Ordem de Producao</DialogTitle>
            <DialogDescription>
              {finalizarOrder && (
                <>
                  Ordem #{finalizarOrder.order_number} —{' '}
                  {finalizarOrder.product_name} (meta: {finalizarOrder.quantity}{' '}
                  un.)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="qty-produced">Itens Produzidos</Label>
              <Input
                id="qty-produced"
                type="number"
                min={0}
                max={finalizarOrder?.quantity ?? 0}
                value={finalizarProduced}
                onChange={(e) => setFinalizarProduced(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty-lost">Perdas</Label>
              <Input
                id="qty-lost"
                type="number"
                min={0}
                value={finalizarLost}
                onChange={(e) => setFinalizarLost(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalizar-datetime">Data/Hora de Conclusao</Label>
              <Input
                id="finalizar-datetime"
                type="datetime-local"
                value={finalizarCompletedAt}
                onChange={(e) => setFinalizarCompletedAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ajuste a data e hora se a conclusao nao for agora.
              </p>
            </div>
            {finalizarOrder &&
              finalizarProduced + finalizarLost > finalizarOrder.quantity && (
                <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    A soma de produzidos + perdas ({finalizarProduced + finalizarLost})
                    excede a meta ({finalizarOrder.quantity}).
                  </span>
                </div>
              )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFinalizarOpen(false)}
              disabled={!!actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFinalizar}
              disabled={!!actionLoading || finalizarProduced < 0}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
