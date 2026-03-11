'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { BOARD_COLUMNS, formatBRL, formatDate, formatDateTime } from '@/lib/constants'
import type { BoardStatus } from '@/lib/constants'
import {
  Plus,
  List,
  Loader2,
  Paperclip,
  CheckSquare,
  X,
  Image as ImageIcon,
  MessageSquare,
  Clock,
  Tag,
  Upload,
  Trash2,
  ExternalLink,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────
interface OrderTag {
  id: string
  name: string
  color: string
}

interface TagAssignment {
  id: string
  tag_id: string
  tag: OrderTag
}

interface OrderItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface BoardOrder {
  id: string
  order_number: number
  status: string
  board_status: string | null
  total: number
  order_date: string
  notes: string | null
  internal_notes: string | null
  attachments: string[]
  checklist: Array<{ text: string; checked: boolean }>
  contact?: { name: string } | null
  company?: { trade_name: string | null; name: string } | null
  salesperson?: { name: string } | null
  items: OrderItem[]
  tag_assignments: TagAssignment[]
}

interface Activity {
  id: string
  action: string
  details: Record<string, string>
  created_by: string | null
  created_at: string
}

// ── Component ──────────────────────────────────────────────
export default function PedidosBoardPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [tags, setTags] = useState<OrderTag[]>([])
  const [loading, setLoading] = useState(true)
  const [companyFilter, setCompanyFilter] = useState<string>('all')

  // Drag state
  const dragItem = useRef<string | null>(null)
  const dragOverColumn = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // Card detail dialog
  const [selectedOrder, setSelectedOrder] = useState<BoardOrder | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Tag management
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6b7280')

  // Checklist
  const [newCheckItem, setNewCheckItem] = useState('')

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch data ──
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/sales-orders')
      const json = await res.json()
      const data = (json.data ?? []).map((o: BoardOrder) => ({
        ...o,
        checklist: Array.isArray(o.checklist) ? o.checklist : [],
        attachments: Array.isArray(o.attachments) ? o.attachments : [],
        tag_assignments: Array.isArray(o.tag_assignments) ? o.tag_assignments : [],
      }))
      setOrders(data)
    } catch {
      console.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/order-tags')
      const json = await res.json()
      setTags(json.data ?? [])
    } catch {
      console.error('Erro ao carregar tags')
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchTags()
  }, [fetchOrders, fetchTags])

  // ── Companies list for filter ──
  const companies = useMemo(() => {
    const map = new Map<string, string>()
    orders.forEach((o) => {
      if (o.company) {
        const key = o.company.trade_name || o.company.name
        // Use company name as key since we don't have company_id in the relation result
        map.set(key, key)
      }
    })
    return Array.from(map.values())
  }, [orders])

  // ── Group orders by board_status ──
  const columns = useMemo(() => {
    let filtered = orders
    if (companyFilter !== 'all') {
      filtered = orders.filter(
        (o) => (o.company?.trade_name || o.company?.name) === companyFilter
      )
    }

    const groups: Record<string, BoardOrder[]> = {}
    for (const col of BOARD_COLUMNS) {
      groups[col.key] = []
    }
    for (const order of filtered) {
      const col = order.board_status || 'pedido_inicial'
      if (groups[col]) {
        groups[col].push(order)
      } else {
        groups['pedido_inicial'].push(order)
      }
    }
    return groups
  }, [orders, companyFilter])

  // ── Drag & Drop handlers ──
  function handleDragStart(orderId: string) {
    dragItem.current = orderId
    setDraggingId(orderId)
  }

  function handleDragOver(e: React.DragEvent, colKey: string) {
    e.preventDefault()
    dragOverColumn.current = colKey
    setDragOverCol(colKey)
  }

  function handleDragLeave() {
    setDragOverCol(null)
  }

  async function handleDrop(colKey: string) {
    const orderId = dragItem.current
    dragItem.current = null
    setDraggingId(null)
    setDragOverCol(null)

    if (!orderId) return

    const order = orders.find((o) => o.id === orderId)
    if (!order || (order.board_status || 'pedido_inicial') === colKey) return

    const oldStatus = order.board_status || 'pedido_inicial'

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, board_status: colKey } : o))
    )

    try {
      await fetch(`/api/sales-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_status: colKey }),
      })

      // Log activity
      await fetch('/api/order-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          action: 'status_change',
          details: { from: oldStatus, to: colKey },
        }),
      })
    } catch {
      // Revert on error
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, board_status: oldStatus } : o))
      )
    }
  }

  // ── Card click (open detail) ──
  async function openCardDetail(order: BoardOrder) {
    setSelectedOrder(order)
    setDetailOpen(true)
    setLoadingActivities(true)

    try {
      const res = await fetch(`/api/order-activities?order_id=${order.id}`)
      const json = await res.json()
      setActivities(json.data ?? [])
    } catch {
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }

  // ── Toggle tag on order ──
  async function toggleTag(orderId: string, tagId: string) {
    try {
      const res = await fetch('/api/order-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, tag_id: tagId }),
      })
      const json = await res.json()

      // Log activity
      const tag = tags.find((t) => t.id === tagId)
      await fetch('/api/order-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          action: json.action === 'added' ? 'tag_added' : 'tag_removed',
          details: { tag: tag?.name || tagId },
        }),
      })

      fetchOrders()
    } catch {
      console.error('Erro ao alternar tag')
    }
  }

  // ── Create tag ──
  async function handleCreateTag() {
    if (!newTagName.trim()) return
    try {
      await fetch('/api/order-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })
      setNewTagName('')
      setNewTagColor('#6b7280')
      fetchTags()
    } catch {
      console.error('Erro ao criar tag')
    }
  }

  // ── Checklist handlers ──
  async function addCheckItem(orderId: string) {
    if (!newCheckItem.trim()) return
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    const updated = [...order.checklist, { text: newCheckItem.trim(), checked: false }]
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, checklist: updated } : o))
    )
    setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, checklist: updated } : prev)
    setNewCheckItem('')

    await fetch(`/api/sales-orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: updated }),
    })
  }

  async function toggleCheckItem(orderId: string, idx: number) {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    const updated = order.checklist.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item
    )
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, checklist: updated } : o))
    )
    setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, checklist: updated } : prev)

    await fetch(`/api/sales-orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: updated }),
    })
  }

  async function removeCheckItem(orderId: string, idx: number) {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    const updated = order.checklist.filter((_, i) => i !== idx)
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, checklist: updated } : o))
    )
    setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, checklist: updated } : prev)

    await fetch(`/api/sales-orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: updated }),
    })
  }

  // ── File upload (URL-based for now) ──
  async function addAttachment(orderId: string, url: string) {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    const updated = [...order.attachments, url]
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, attachments: updated } : o))
    )
    setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, attachments: updated } : prev)

    await fetch(`/api/sales-orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachments: updated }),
    })

    await fetch('/api/order-activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        action: 'file_uploaded',
        details: { url },
      }),
    })
  }

  async function removeAttachment(orderId: string, idx: number) {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    const updated = order.attachments.filter((_, i) => i !== idx)
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, attachments: updated } : o))
    )
    setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, attachments: updated } : prev)

    await fetch(`/api/sales-orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachments: updated }),
    })
  }

  // ── Helpers ──
  function isImageUrl(url: string) {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url)
  }

  function getChecklistProgress(checklist: Array<{ text: string; checked: boolean }>) {
    if (!checklist.length) return null
    const checked = checklist.filter((c) => c.checked).length
    return { checked, total: checklist.length }
  }

  function getActivityLabel(action: string, details: Record<string, string>) {
    const labels: Record<string, string> = {
      exportacoes: 'Exportações',
      aguardando: 'Aguardando',
      amostras: 'Amostras',
      pedido_inicial: 'Pedido Inicial',
      personalizacao: 'Personalização',
      preparacao: 'Preparação/Faturamento',
      pronto: 'Pronto',
      despachado: 'Despachado',
    }

    switch (action) {
      case 'status_change':
        return `Movido de "${labels[details.from] || details.from}" para "${labels[details.to] || details.to}"`
      case 'tag_added':
        return `Tag "${details.tag}" adicionada`
      case 'tag_removed':
        return `Tag "${details.tag}" removida`
      case 'file_uploaded':
        return 'Arquivo anexado'
      case 'note_added':
        return 'Nota adicionada'
      default:
        return action
    }
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Board de Pedidos" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => (
            <div key={col.key} className="min-w-[280px] space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Board de Pedidos"
        description="Gestao visual de pedidos estilo Kanban"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTagDialogOpen(true)}>
              <Tag className="mr-1.5 h-3.5 w-3.5" />
              Tags
            </Button>
            <Link href="/pedidos">
              <Button variant="outline" size="sm">
                <List className="mr-1.5 h-3.5 w-3.5" />
                Lista
              </Button>
            </Link>
            <Link href="/pedidos/novo">
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo Pedido
              </Button>
            </Link>
          </div>
        }
      />

      {/* Company filter */}
      {companies.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Empresa:</span>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {companies.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {BOARD_COLUMNS.map((col) => {
          const colOrders = columns[col.key] || []
          const isOver = dragOverCol === col.key

          return (
            <div
              key={col.key}
              className={`flex flex-col min-w-[280px] max-w-[280px] rounded-lg transition-colors ${
                isOver ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-muted/30'
              }`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(col.key)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 p-3 pb-2">
                <div className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </span>
                <Badge variant="secondary" className="ml-auto border-0 bg-muted text-xs font-medium">
                  {colOrders.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 p-2 pt-0">
                {colOrders.map((order) => {
                  const progress = getChecklistProgress(order.checklist)
                  const orderTags = order.tag_assignments
                    .map((ta) => ta.tag)
                    .filter(Boolean)
                  const hasAttachments = order.attachments.length > 0

                  return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={() => handleDragStart(order.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                      onClick={() => openCardDetail(order)}
                      className={`group cursor-pointer rounded-lg border bg-background p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${
                        draggingId === order.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      {/* Client name + date */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium leading-tight">
                          {order.contact?.name ?? `#${order.order_number}`}
                          {order.order_date && (
                            <span className="text-muted-foreground font-normal"> ({new Date(order.order_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})</span>
                          )}
                        </h4>
                      </div>

                      {/* Company */}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Em Pedidos {order.company?.trade_name || order.company?.name || 'Winepopper'}
                      </p>

                      {/* Indicators row */}
                      <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                        {/* Items count */}
                        <div className="flex items-center gap-1 text-xs">
                          <List className="h-3 w-3" />
                          <span>{order.items.length}</span>
                        </div>

                        {/* Checklist progress */}
                        {progress && (
                          <div className="flex items-center gap-1 text-xs">
                            <CheckSquare className="h-3 w-3" />
                            <span>{progress.checked}/{progress.total}</span>
                          </div>
                        )}

                        {/* Attachments */}
                        {hasAttachments && (
                          <div className="flex items-center gap-1 text-xs">
                            <Paperclip className="h-3 w-3" />
                          </div>
                        )}

                        {/* Notes indicator */}
                        {order.notes && (
                          <div className="flex items-center gap-1 text-xs">
                            <MessageSquare className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {orderTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {orderTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {orderTags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              +{orderTags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ============================================================
          Dialog: Card Detail
      ============================================================ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg">
                    {selectedOrder.contact?.name ?? `Pedido #${selectedOrder.order_number}`}
                  </DialogTitle>
                  <Badge variant="outline" className="text-xs">#{selectedOrder.order_number}</Badge>
                </div>
                <DialogDescription>
                  {selectedOrder.company?.trade_name || selectedOrder.company?.name} &middot; {formatDate(selectedOrder.order_date)} &middot; {formatBRL(selectedOrder.total)}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-5 py-2">
                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Tags
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => {
                        const isAssigned = selectedOrder.tag_assignments.some(
                          (ta) => ta.tag_id === tag.id
                        )
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(selectedOrder.id, tag.id)}
                            className={`rounded px-2 py-1 text-xs font-medium transition-all ${
                              isAssigned
                                ? 'text-white shadow-sm'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                            style={isAssigned ? { backgroundColor: tag.color } : undefined}
                          >
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <List className="h-3 w-3" /> Itens ({selectedOrder.items.length})
                    </Label>
                    <div className="rounded-lg border divide-y">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span>{item.description}</span>
                          <span className="text-muted-foreground text-xs">{item.quantity}x {formatBRL(item.unit_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" /> Checklist
                    </Label>
                    <div className="space-y-1.5">
                      {selectedOrder.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 group/check">
                          <Checkbox
                            checked={item.checked}
                            onChange={() => toggleCheckItem(selectedOrder.id, idx)}
                          />
                          <span className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => removeCheckItem(selectedOrder.id, idx)}
                            className="opacity-0 group-hover/check:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Novo item..."
                        value={newCheckItem}
                        onChange={(e) => setNewCheckItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addCheckItem(selectedOrder.id)
                          }
                        }}
                        className="h-8 text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => addCheckItem(selectedOrder.id)} className="h-8">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Attachments / Files */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> Anexos ({selectedOrder.attachments.length})
                    </Label>
                    {selectedOrder.attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedOrder.attachments.map((url, idx) => (
                          <div key={idx} className="group/file relative rounded-lg border overflow-hidden">
                            {isImageUrl(url) ? (
                              <button
                                onClick={() => setPreviewImage(url)}
                                className="w-full"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Anexo ${idx + 1}`}
                                  className="w-full h-24 object-cover"
                                />
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 p-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {url.split('/').pop() || 'Arquivo'}
                                </a>
                              </div>
                            )}
                            <button
                              onClick={() => removeAttachment(selectedOrder.id, idx)}
                              className="absolute top-1 right-1 opacity-0 group-hover/file:opacity-100 bg-background/80 rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL do arquivo ou imagem..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.currentTarget
                            if (input.value.trim()) {
                              addAttachment(selectedOrder.id, input.value.trim())
                              input.value = ''
                            }
                          }
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  {(selectedOrder.notes || selectedOrder.internal_notes) && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Observacoes
                      </Label>
                      {selectedOrder.notes && (
                        <p className="text-sm rounded-lg bg-muted p-2">{selectedOrder.notes}</p>
                      )}
                      {selectedOrder.internal_notes && (
                        <p className="text-sm rounded-lg bg-yellow-50 border border-yellow-200 p-2">
                          <span className="text-xs font-medium text-yellow-700">Interno:</span> {selectedOrder.internal_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Activity Log */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Historico
                    </Label>
                    {loadingActivities ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : activities.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Nenhuma atividade registrada.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activities.map((a) => (
                          <div key={a.id} className="flex items-start gap-2 text-xs">
                            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <span>{getActivityLabel(a.action, a.details)}</span>
                              <span className="text-muted-foreground ml-2">
                                {formatDateTime(a.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
                  Fechar
                </Button>
                <Link href={`/pedidos/${selectedOrder.id}`}>
                  <Button size="sm">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Abrir Pedido
                  </Button>
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================
          Dialog: Manage Tags
      ============================================================ */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Tags</DialogTitle>
            <DialogDescription>
              Crie e gerencie tags para categorizar seus pedidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing tags */}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </div>
              ))}
            </div>

            {/* Create new tag */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ex: urgente"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cor</Label>
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-8 w-10 rounded border cursor-pointer"
                />
              </div>
              <Button size="sm" onClick={handleCreateTag} className="h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTagDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          Dialog: Image Preview
      ============================================================ */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-3xl p-2">
          {previewImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewImage}
              alt="Preview"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
