'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatBRL, formatDate, ORDER_STATUS_LABELS } from '@/lib/constants'
import { ShoppingCart, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface DashboardData {
  revenue_this_month: number
  orders_this_month: number
  pending_orders: number
  low_stock_items: { id: string; name: string; sku: string; available: number; min_quantity: number }[]
  revenue_by_month: { month: string; revenue: number }[]
  orders_by_status: Record<string, number>
  financial: {
    open_receivables: number
    open_payables: number
    overdue_count: number
    overdue_total: number
  }
  recent_orders?: {
    id: string
    order_number: number
    contact_name: string
    total: number
    status: string
    order_date: string
  }[]
}

const PIE_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#10b981', // green
  '#ef4444', // red
  '#f97316', // orange
  '#64748b', // slate
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    {
      title: 'Receita no Mes',
      value: data ? formatBRL(data.revenue_this_month) : '-',
      icon: DollarSign,
      description: 'receita total este mes',
      color: 'text-green-600',
    },
    {
      title: 'Pedidos no Mes',
      value: data ? String(data.orders_this_month) : '-',
      icon: ShoppingCart,
      description: 'pedidos realizados',
      color: 'text-blue-600',
    },
    {
      title: 'Pedidos Pendentes',
      value: data ? String(data.pending_orders) : '-',
      icon: Clock,
      description: 'aguardando aprovacao',
      color: 'text-yellow-600',
    },
    {
      title: 'Estoque Baixo',
      value: data ? String(data.low_stock_items.length) : '-',
      icon: AlertTriangle,
      description: 'itens abaixo do minimo',
      color: 'text-red-600',
    },
  ]

  const pieData = data
    ? Object.entries(data.orders_by_status)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status,
          value: count,
          status,
        }))
    : []

  const revenueData = data?.revenue_by_month ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visao geral do seu negocio"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
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

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : revenueData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                Sem dados de receita
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        compactDisplay: 'short',
                        style: 'currency',
                        currency: 'BRL',
                      }).format(value)
                    }
                  />
                  <Tooltip
                    formatter={(value) => [formatBRL(Number(value)), 'Receita']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                Sem pedidos registrados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${Number(value)} pedido${Number(value) !== 1 ? 's' : ''}`,
                      String(name),
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.recent_orders || data.recent_orders.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Nenhum pedido encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.order_number}
                    </TableCell>
                    <TableCell>{order.contact_name}</TableCell>
                    <TableCell>{formatBRL(order.total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} type="order" />
                    </TableCell>
                    <TableCell>{formatDate(order.order_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
