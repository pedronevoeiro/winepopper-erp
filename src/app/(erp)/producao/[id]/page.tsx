'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  ArrowLeft,
  Play,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Package,
  Calendar,
  Users,
  Pencil,
  Save,
  Trash2,
} from 'lucide-react'
import type { ErpProductionStatus } from '@/types/database'

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ProductionComponent {
  component_id: string
  component_name: string
  component_sku: string | null
  required_qty: number
  consumed_qty: number
  unit?: string
}

interface ProductionWorker {
  id: string
  name: string
  role: string | null
}

interface AvailableWorker {
  id: string
  name: string
  role: string | null
  active: boolean
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
  components: ProductionComponent[]
  workers: ProductionWorker[]
}

export default function ProductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()
  const [order, setOrder] = useState<ProductionOrderEnriched | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Datetime for start/finalize
  const [startDatetime, setStartDatetime] = useState('')
  const [completeDatetime, setCompleteDatetime] = useState('')

  // Finalizar form state
  const [qtyProduced, setQtyProduced] = useState(0)
  const [qtyLost, setQtyLost] = useState(0)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editQuantity, setEditQuantity] = useState(0)
  const [editNotes, setEditNotes] = useState('')
  const [editPlannedDate, setEditPlannedDate] = useState('')
  const [editStartedAt, setEditStartedAt] = useState('')
  const [editCompletedAt, setEditCompletedAt] = useState('')
  const [editWorkers, setEditWorkers] = useState<string[]>([])
  const [editQuantityProduced, setEditQuantityProduced] = useState(0)
  const [editQuantityLost, setEditQuantityLost] = useState(0)
  const [availableWorkers, setAvailableWorkers] = useState<AvailableWorker[]>([])
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDelete() {
    if (!order) return
    const warning = order.status === 'completed'
      ? 'Esta ordem esta concluida. Excluir ira reverter os ajustes de estoque. Deseja continuar?'
      : 'Tem certeza que deseja excluir esta ordem de producao?'
    if (!window.confirm(warning)) return
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/production', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao excluir')
      }
      router.push('/producao')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleteLoading(false)
    }
  }

  const fetchOrder = useCallback(() => {
    setLoading(true)
    fetch('/api/production')
      .then((res) => res.json())
      .then((json) => {
        const all: ProductionOrderEnriched[] = Array.isArray(json.data)
          ? json.data
          : []
        const found = all.find((o) => o.id === id)
        if (found) {
          setOrder(found)
          setQtyProduced(found.quantity_produced || found.quantity)
          setQtyLost(found.quantity_lost || 0)
          setStartDatetime(toLocalDatetime(new Date().toISOString()))
          setCompleteDatetime(toLocalDatetime(new Date().toISOString()))
        } else {
          setNotFound(true)
        }
      })
      .catch((err) => {
        console.error(err)
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // Fetch available workers for edit dialog
  useEffect(() => {
    fetch('/api/production-workers')
      .then((res) => res.json())
      .then((json) => setAvailableWorkers(Array.isArray(json.data) ? json.data : []))
      .catch(console.error)
  }, [])

  // Open edit dialog
  function openEdit() {
    if (!order) return
    setEditQuantity(order.quantity)
    setEditNotes(order.notes || '')
    setEditPlannedDate(order.planned_date ? toLocalDatetime(order.planned_date) : '')
    setEditStartedAt(order.started_at ? toLocalDatetime(order.started_at) : '')
    setEditCompletedAt(order.completed_at ? toLocalDatetime(order.completed_at) : '')
    setEditWorkers([...order.assigned_workers])
    setEditQuantityProduced(order.quantity_produced)
    setEditQuantityLost(order.quantity_lost)
    setEditOpen(true)
  }

  // Save edit
  async function handleSaveEdit() {
    if (!order) return
    setEditLoading(true)
    try {
      const res = await fetch('/api/production', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          quantity: editQuantity,
          notes: editNotes || null,
          planned_date: editPlannedDate ? new Date(editPlannedDate).toISOString() : null,
          started_at: editStartedAt ? new Date(editStartedAt).toISOString() : null,
          completed_at: editCompletedAt ? new Date(editCompletedAt).toISOString() : null,
          assigned_workers: editWorkers,
          quantity_produced: editQuantityProduced,
          quantity_lost: editQuantityLost,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar alteracoes')
      }
      setEditOpen(false)
      fetchOrder()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Erro ao salvar alteracoes')
    } finally {
      setEditLoading(false)
    }
  }

  // Toggle worker in edit
  function toggleWorker(workerId: string) {
    setEditWorkers((prev) =>
      prev.includes(workerId)
        ? prev.filter((w) => w !== workerId)
        : [...prev, workerId]
    )
  }

  // Start production
  async function handleStart() {
    if (!order) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/production', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'in_progress',
          started_at: startDatetime ? new Date(startDatetime).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao iniciar producao')
      }
      fetchOrder()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Erro ao iniciar producao')
    } finally {
      setActionLoading(false)
    }
  }

  // Finalize production
  async function handleFinalize() {
    if (!order) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/production', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'completed',
          quantity_produced: qtyProduced,
          quantity_lost: qtyLost,
          completed_at: completeDatetime ? new Date(completeDatetime).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao finalizar producao')
      }
      fetchOrder()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Erro ao finalizar producao')
    } finally {
      setActionLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ordem de Producao"
          actions={
            <Link href="/producao">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          }
        />
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not found state
  if (notFound || !order) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ordem de Producao"
          actions={
            <Link href="/producao">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          }
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Ordem nao encontrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A ordem de producao solicitada nao existe ou foi removida.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Ordem de Producao #${order.order_number}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} type="production" />
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Link href="/producao">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        }
      />

      {/* Info section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Product info */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{order.product_name}</div>
            {order.product_sku && (
              <div className="text-sm text-muted-foreground">
                SKU: {order.product_sku}
              </div>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Meta: </span>
                <span className="font-medium">{order.quantity} un.</span>
              </div>
              <div>
                <span className="text-muted-foreground">Produzido: </span>
                <span className="font-medium">{order.quantity_produced}</span>
              </div>
              {order.quantity_lost > 0 && (
                <div>
                  <span className="text-muted-foreground">Perdas: </span>
                  <span className="font-medium text-red-600">
                    {order.quantity_lost}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planejada:</span>
              <span className="font-medium">
                {order.planned_date ? formatDate(order.planned_date) : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inicio:</span>
              <span className="font-medium">
                {order.started_at ? formatDate(order.started_at) : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conclusao:</span>
              <span className="font-medium">
                {order.completed_at ? formatDate(order.completed_at) : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criado em:</span>
              <span className="font-medium">
                {formatDate(order.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Workers */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Responsaveis</CardTitle>
          </CardHeader>
          <CardContent>
            {order.workers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum responsavel atribuido
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {order.workers.map((w) => (
                  <Badge key={w.id} variant="secondary" className="text-xs">
                    {w.name}
                    {w.role && (
                      <span className="ml-1 opacity-60">({w.role})</span>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Components table */}
      <Card>
        <CardHeader>
          <CardTitle>Componentes</CardTitle>
        </CardHeader>
        <CardContent>
          {order.components.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum componente registrado nesta ordem.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead className="w-[80px]">Unidade</TableHead>
                  <TableHead className="text-right">Qtd Necessaria</TableHead>
                  <TableHead className="text-right">Qtd Consumida</TableHead>
                  <TableHead className="text-center w-[80px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.components.map((c) => {
                  const fulfilled = c.consumed_qty >= c.required_qty
                  return (
                    <TableRow key={c.component_id}>
                      <TableCell>
                        <div className="font-medium">{c.component_name}</div>
                        {c.component_sku && (
                          <div className="text-xs text-muted-foreground">
                            {c.component_sku}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.unit || 'un'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {c.required_qty}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.consumed_qty}
                      </TableCell>
                      <TableCell className="text-center">
                        {fulfilled ? (
                          <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="mx-auto h-5 w-5 text-yellow-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action: Start Production */}
      {order.status === 'pending' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="start-datetime">Data/Hora de Inicio</Label>
                <Input
                  id="start-datetime"
                  type="datetime-local"
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ajuste se o inicio nao for agora.
                </p>
              </div>
              <Button onClick={handleStart} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Iniciar Producao
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action: Finalize Production */}
      {order.status === 'in_progress' && (
        <Card>
          <CardHeader>
            <CardTitle>Finalizar Producao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="detail-qty-produced">Itens Produzidos</Label>
                <Input
                  id="detail-qty-produced"
                  type="number"
                  min={0}
                  max={order.quantity}
                  value={qtyProduced}
                  onChange={(e) => setQtyProduced(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-qty-lost">Perdas</Label>
                <Input
                  id="detail-qty-lost"
                  type="number"
                  min={0}
                  value={qtyLost}
                  onChange={(e) => setQtyLost(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complete-datetime">Data/Hora Conclusao</Label>
                <Input
                  id="complete-datetime"
                  type="datetime-local"
                  value={completeDatetime}
                  onChange={(e) => setCompleteDatetime(e.target.value)}
                />
              </div>
            </div>

            {qtyProduced + qtyLost > order.quantity && (
              <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  A soma de produzidos + perdas ({qtyProduced + qtyLost})
                  excede a meta ({order.quantity}).
                </span>
              </div>
            )}

            <Button onClick={handleFinalize} disabled={actionLoading || qtyProduced < 0}>
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Finalizar Producao
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed summary */}
      {order.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Producao</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {order.quantity_produced}
                </div>
                <div className="text-sm text-muted-foreground">
                  Itens Produzidos
                </div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {order.quantity_lost}
                </div>
                <div className="text-sm text-muted-foreground">Perdas</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">
                  {order.quantity > 0
                    ? (
                        (order.quantity_produced / order.quantity) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </div>
                <div className="text-sm text-muted-foreground">
                  Aproveitamento
                </div>
              </div>
            </div>
            {order.started_at && order.completed_at && (
              <div className="mt-4 text-sm text-muted-foreground">
                Producao realizada de{' '}
                <span className="font-medium text-foreground">
                  {formatDate(order.started_at)}
                </span>{' '}
                a{' '}
                <span className="font-medium text-foreground">
                  {formatDate(order.completed_at)}
                </span>
                .
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Ordem #{order.order_number}</DialogTitle>
            <DialogDescription>
              Altere as informacoes da ordem de producao.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantidade (Meta)</Label>
              <Input
                id="edit-quantity"
                type="number"
                min={1}
                value={editQuantity}
                onChange={(e) => setEditQuantity(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-planned-date">Data Planejada</Label>
              <Input
                id="edit-planned-date"
                type="datetime-local"
                value={editPlannedDate}
                onChange={(e) => setEditPlannedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-started-at">Data/Hora de Inicio</Label>
              <Input
                id="edit-started-at"
                type="datetime-local"
                value={editStartedAt}
                onChange={(e) => setEditStartedAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-completed-at">Data/Hora de Conclusao</Label>
              <Input
                id="edit-completed-at"
                type="datetime-local"
                value={editCompletedAt}
                onChange={(e) => setEditCompletedAt(e.target.value)}
              />
            </div>

            {(order.status === 'in_progress' || order.status === 'completed') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-qty-produced">Itens Produzidos</Label>
                  <Input
                    id="edit-qty-produced"
                    type="number"
                    min={0}
                    value={editQuantityProduced}
                    onChange={(e) => setEditQuantityProduced(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-qty-lost">Perdas</Label>
                  <Input
                    id="edit-qty-lost"
                    type="number"
                    min={0}
                    value={editQuantityLost}
                    onChange={(e) => setEditQuantityLost(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Responsaveis</Label>
              {availableWorkers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum funcionario cadastrado.</p>
              ) : (
                <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                  {availableWorkers
                    .filter((w) => w.active)
                    .map((w) => (
                      <label
                        key={w.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editWorkers.includes(w.id)}
                          onChange={() => toggleWorker(w.id)}
                          className="rounded border-gray-300"
                        />
                        <span>{w.name}</span>
                        {w.role && (
                          <span className="text-muted-foreground">({w.role})</span>
                        )}
                      </label>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observacoes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={deleteLoading || editLoading}
            >
              {deleteLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir Ordem
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
