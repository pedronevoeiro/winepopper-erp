'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  formatBRL,
  formatDate,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/lib/constants'
import { Plus, ShoppingCart } from 'lucide-react'
import type { ErpOrderStatus } from '@/types/database'

interface OrderWithRelations {
  id: string
  order_number: number
  status: ErpOrderStatus
  total: number
  order_date: string
  contact_id: string
  salesperson_id: string | null
  company_id: string | null
  contact?: { name: string }
  salesperson?: { name: string }
  company?: { trade_name: string | null; name: string }
}

const ALL_STATUSES: (ErpOrderStatus | 'all')[] = [
  'all',
  'draft',
  'pending',
  'approved',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
]

export default function PedidosPage() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/sales-orders')
      .then((res) => res.json())
      .then((json) => setOrders(Array.isArray(json) ? json : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const companies = useMemo(() => {
    const map = new Map<string, string>()
    orders.forEach((o) => {
      if (o.company_id && o.company) {
        map.set(o.company_id, o.company.trade_name || o.company.name)
      }
    })
    return Array.from(map.entries())
  }, [orders])

  const filtered = useMemo(() => {
    let result = orders

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter)
    }
    if (companyFilter !== 'all') {
      result = result.filter((o) => o.company_id === companyFilter)
    }

    return result
  }, [orders, statusFilter, companyFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1
    })
    return counts
  }, [orders])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos de Venda"
        description="Gerencie seus pedidos de venda"
        actions={
          <Link href="/pedidos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Pedido
            </Button>
          </Link>
        }
      />

      {/* Status filter badges */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((status) => {
          const isActive = statusFilter === status
          const count = statusCounts[status] ?? 0
          const label = status === 'all' ? 'Todos' : ORDER_STATUS_LABELS[status]
          const colorClass =
            status === 'all'
              ? isActive
                ? 'bg-primary text-primary-foreground'
                : ''
              : isActive
                ? ORDER_STATUS_COLORS[status]
                : ''

          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="focus:outline-none"
            >
              <Badge
                variant={isActive ? 'secondary' : 'outline'}
                className={`cursor-pointer border-0 px-3 py-1 text-xs font-medium transition-colors ${
                  isActive ? colorClass : 'hover:bg-accent'
                }`}
              >
                {label}
                <span className="ml-1.5 opacity-70">{count}</span>
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Company filter */}
      {companies.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Empresa:</span>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {companies.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Orders table */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhum pedido encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter !== 'all'
                ? 'Tente mudar o filtro de status.'
                : 'Crie seu primeiro pedido de venda clicando no botao acima.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#Numero</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.order_number}
                    </TableCell>
                    <TableCell>{order.contact?.name ?? '-'}</TableCell>
                    <TableCell>
                      {order.company?.trade_name || order.company?.name || '-'}
                    </TableCell>
                    <TableCell>{order.salesperson?.name ?? '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(order.total)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} type="order" />
                    </TableCell>
                    <TableCell>{formatDate(order.order_date)}</TableCell>
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
