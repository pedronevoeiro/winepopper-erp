'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Truck,
  Printer,
  RefreshCw,
  Package,
  MapPin,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'

interface OrderForShipping {
  id: string
  order_number: number
  contact_name: string
  company_name: string | null
  total: number
  status: string
  shipping_method: string | null
  shipping_tracking: string | null
  carrier_name: string | null
  melhorenvio_id: string | null
  shipping_address: Record<string, string> | null
  expected_date: string | null
  created_at: string
  sales_channel?: string
  store_name?: string
}

type TabType = 'ready' | 'shipped' | 'delivered'

export default function EnviosPage() {
  const [orders, setOrders] = useState<OrderForShipping[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [tab, setTab] = useState<TabType>('ready')
  const [channelFilter, setChannelFilter] = useState<string>('all')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sales-orders')
      if (res.ok) {
        const data = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (data.data || []).map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          contact_name: o.contact?.name || '—',
          company_name: o.company?.trade_name || o.company?.name || null,
          total: o.total,
          status: o.status,
          shipping_method: o.shipping_method,
          shipping_tracking: o.shipping_tracking,
          carrier_name: o.carrier_name,
          melhorenvio_id: o.melhorenvio_id,
          shipping_address: o.shipping_address,
          expected_date: o.expected_date,
          created_at: o.created_at,
          sales_channel: o.sales_channel,
          store_name: o.store_name,
        }))
        setOrders(mapped)
      }
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const filteredOrders = orders.filter((o) => {
    const statusMatch =
      tab === 'ready' ? (o.status === 'ready' || o.status === 'approved') :
      tab === 'shipped' ? o.status === 'shipped' :
      o.status === 'delivered'

    const channelMatch = channelFilter === 'all' || o.sales_channel === channelFilter

    return statusMatch && channelMatch
  })

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filteredOrders.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredOrders.map((o) => o.id)))
    }
  }

  const handleGenerateLabels = async () => {
    if (selected.size === 0) return
    setGenerating(true)
    try {
      const res = await fetch('/api/shipping/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (data.success > 0) {
        alert(`${data.success} etiqueta(s) gerada(s) com sucesso!${data.failed > 0 ? ` ${data.failed} falharam.` : ''}`)
        setSelected(new Set())
        fetchOrders()
      } else {
        alert(`Erro: ${data.results?.[0]?.error || 'Falha ao gerar etiquetas'}`)
      }
    } catch (err) {
      alert(`Erro: ${err}`)
    } finally {
      setGenerating(false)
    }
  }

  const handlePrintLabels = async () => {
    const withLabels = filteredOrders.filter((o) => selected.has(o.id) && o.melhorenvio_id)
    if (withLabels.length === 0) {
      alert('Nenhum pedido selecionado possui etiqueta gerada.')
      return
    }
    setPrinting(true)
    try {
      const res = await fetch('/api/shipping/labels/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ melhorenvio_ids: withLabels.map((o) => o.melhorenvio_id) }),
      })
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      } else {
        alert(`Erro: ${data.error || 'Falha ao gerar PDF'}`)
      }
    } catch (err) {
      alert(`Erro: ${err}`)
    } finally {
      setPrinting(false)
    }
  }

  const handleRefreshTracking = async () => {
    const withTracking = orders.filter((o) => o.melhorenvio_id && o.status === 'shipped')
    if (withTracking.length === 0) return
    setTracking(true)
    try {
      const res = await fetch('/api/shipping/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ melhorenvio_ids: withTracking.map((o) => o.melhorenvio_id) }),
      })
      if (res.ok) {
        fetchOrders()
      }
    } catch (err) {
      console.error('Erro ao atualizar rastreamento:', err)
    } finally {
      setTracking(false)
    }
  }

  const readyCount = orders.filter((o) => o.status === 'ready' || o.status === 'approved').length
  const shippedCount = orders.filter((o) => o.status === 'shipped').length
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length

  const isDelayed = (order: OrderForShipping) => {
    if (order.status !== 'shipped' || !order.expected_date) return false
    return new Date(order.expected_date) < new Date()
  }
  const delayedCount = orders.filter(isDelayed).length

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Envios e Etiquetas"
        description="Geração de etiquetas, impressão em massa e rastreamento de envios"
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary" onClick={() => setTab('ready')}>
          <CardContent className="flex items-center gap-3 py-4">
            <Package className={`h-8 w-8 ${tab === 'ready' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-2xl font-bold">{readyCount}</p>
              <p className="text-xs text-muted-foreground">Prontos p/ envio</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary" onClick={() => setTab('shipped')}>
          <CardContent className="flex items-center gap-3 py-4">
            <Truck className={`h-8 w-8 ${tab === 'shipped' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-2xl font-bold">{shippedCount}</p>
              <p className="text-xs text-muted-foreground">Em trânsito</p>
            </div>
          </CardContent>
        </Card>
        {delayedCount > 0 && (
          <Card className="cursor-pointer border-amber-200 bg-amber-50 hover:ring-2 hover:ring-amber-400" onClick={() => setTab('shipped')}>
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-700">{delayedCount}</p>
                <p className="text-xs text-amber-600">Atrasados</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary" onClick={() => setTab('delivered')}>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className={`h-8 w-8 ${tab === 'delivered' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-2xl font-bold">{deliveredCount}</p>
              <p className="text-xs text-muted-foreground">Entregues</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Canal:</span>
        {['all', 'b2b', 'b2c'].map((ch) => (
          <Button
            key={ch}
            variant={channelFilter === ch ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChannelFilter(ch)}
          >
            {ch === 'all' ? 'Todos' : ch.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {tab === 'ready' && (
          <Button onClick={handleGenerateLabels} disabled={selected.size === 0 || generating}>
            <Package className="mr-2 h-4 w-4" />
            {generating ? 'Gerando...' : `Gerar Etiquetas (${selected.size})`}
          </Button>
        )}
        {(tab === 'ready' || tab === 'shipped') && (
          <Button variant="outline" onClick={handlePrintLabels} disabled={selected.size === 0 || printing}>
            <Printer className="mr-2 h-4 w-4" />
            {printing ? 'Gerando PDF...' : 'Imprimir Etiquetas'}
          </Button>
        )}
        {tab === 'shipped' && (
          <Button variant="outline" onClick={handleRefreshTracking} disabled={tracking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${tracking ? 'animate-spin' : ''}`} />
            Atualizar Rastreamento
          </Button>
        )}
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {tab === 'ready' ? 'Pedidos Prontos para Envio' : tab === 'shipped' ? 'Pedidos em Trânsito' : 'Pedidos Entregues'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum pedido nesta categoria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-3 w-8">
                      <Checkbox
                        checked={selected.size === filteredOrders.length && filteredOrders.length > 0}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="pb-3 pr-3">Pedido</th>
                    <th className="pb-3 pr-3">Cliente</th>
                    <th className="pb-3 pr-3">Canal</th>
                    <th className="pb-3 pr-3">Destino</th>
                    <th className="pb-3 pr-3">Total</th>
                    <th className="pb-3 pr-3">Transportadora</th>
                    <th className="pb-3 pr-3">Rastreio</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-3">
                        <Checkbox
                          checked={selected.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                        />
                      </td>
                      <td className="py-3 pr-3 font-medium">#{order.order_number}</td>
                      <td className="py-3 pr-3">
                        <div>{order.contact_name}</div>
                        {order.company_name && (
                          <div className="text-xs text-muted-foreground">{order.company_name}</div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline" className="text-xs">
                          {order.sales_channel === 'b2c' ? 'B2C' : 'B2B'}
                        </Badge>
                        {order.store_name && (
                          <div className="text-xs text-muted-foreground mt-0.5">{order.store_name}</div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">
                            {order.shipping_address?.city || '—'}/{order.shipping_address?.state || ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-medium">{formatBRL(order.total)}</td>
                      <td className="py-3 pr-3 text-xs">{order.carrier_name || order.shipping_method || '—'}</td>
                      <td className="py-3 pr-3">
                        {order.shipping_tracking ? (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <ExternalLink className="h-3 w-3" />
                            {order.shipping_tracking}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={order.status} hasLabel={!!order.melhorenvio_id} />
                          {isDelayed(order) && (
                            <span title={`Prazo previsto: ${new Date(order.expected_date!).toLocaleDateString('pt-BR')}`}>
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status, hasLabel }: { status: string; hasLabel: boolean }) {
  if (status === 'delivered') {
    return <Badge className="bg-green-100 text-green-800">Entregue</Badge>
  }
  if (status === 'shipped') {
    return <Badge className="bg-indigo-100 text-indigo-800">Enviado</Badge>
  }
  if (hasLabel) {
    return <Badge className="bg-blue-100 text-blue-800">Etiqueta gerada</Badge>
  }
  if (status === 'ready') {
    return <Badge className="bg-cyan-100 text-cyan-800">Pronto</Badge>
  }
  return <Badge className="bg-yellow-100 text-yellow-800">Aprovado</Badge>
}
