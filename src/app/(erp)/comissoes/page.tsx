'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatBRL } from '@/lib/constants'
import { Mail, Phone } from 'lucide-react'
import type { ErpCommissionStatus } from '@/types/database'

interface CommissionEntry {
  id: string
  orderNumber: number
  clientName: string
  salesperson: string
  orderTotal: number
  rate: number
  commissionValue: number
  status: ErpCommissionStatus
}

interface Salesperson {
  name: string
  email: string
  phone: string
  commissionRate: number
  active: boolean
}

interface SalespersonSummary {
  name: string
  email: string
  phone: string
  commissionRate: number
  totalSales: number
  pending: number
  approved: number
  paid: number
  total: number
}

const salespeople: Salesperson[] = [
  {
    name: 'Carlos Mendes',
    email: 'carlos@winepopper.com.br',
    phone: '(11) 99999-0001',
    commissionRate: 5,
    active: true,
  },
  {
    name: 'Ana Oliveira',
    email: 'ana@winepopper.com.br',
    phone: '(11) 99999-0002',
    commissionRate: 6,
    active: true,
  },
  {
    name: 'Roberto Santos',
    email: 'roberto@winepopper.com.br',
    phone: '(11) 99999-0003',
    commissionRate: 4.5,
    active: true,
  },
]

const commissions: CommissionEntry[] = [
  {
    id: '1',
    orderNumber: 1001,
    clientName: 'Tech Solutions Ltda',
    salesperson: 'Carlos Mendes',
    orderTotal: 45000,
    rate: 5,
    commissionValue: 2250,
    status: 'paid',
  },
  {
    id: '2',
    orderNumber: 1002,
    clientName: 'Banco Central Corp',
    salesperson: 'Ana Oliveira',
    orderTotal: 62000,
    rate: 6,
    commissionValue: 3720,
    status: 'paid',
  },
  {
    id: '3',
    orderNumber: 1003,
    clientName: 'Vinhos Premium SA',
    salesperson: 'Roberto Santos',
    orderTotal: 38000,
    rate: 4.5,
    commissionValue: 1710,
    status: 'approved',
  },
  {
    id: '4',
    orderNumber: 1004,
    clientName: 'Eventos Gold',
    salesperson: 'Carlos Mendes',
    orderTotal: 55000,
    rate: 5,
    commissionValue: 2750,
    status: 'approved',
  },
  {
    id: '5',
    orderNumber: 1005,
    clientName: 'Hotel Fasano',
    salesperson: 'Ana Oliveira',
    orderTotal: 71000,
    rate: 6,
    commissionValue: 4260,
    status: 'pending',
  },
  {
    id: '6',
    orderNumber: 1006,
    clientName: 'Restaurante Mani',
    salesperson: 'Roberto Santos',
    orderTotal: 42000,
    rate: 4.5,
    commissionValue: 1890,
    status: 'pending',
  },
  {
    id: '7',
    orderNumber: 1007,
    clientName: 'Magazine Express',
    salesperson: 'Carlos Mendes',
    orderTotal: 87500,
    rate: 5,
    commissionValue: 4375,
    status: 'pending',
  },
  {
    id: '8',
    orderNumber: 1008,
    clientName: 'Distribuidora Nacional',
    salesperson: 'Ana Oliveira',
    orderTotal: 92000,
    rate: 6,
    commissionValue: 5520,
    status: 'paid',
  },
  {
    id: '9',
    orderNumber: 1009,
    clientName: 'Emporio Santa Maria',
    salesperson: 'Roberto Santos',
    orderTotal: 62000,
    rate: 4.5,
    commissionValue: 2790,
    status: 'paid',
  },
]

function buildSummaries(): SalespersonSummary[] {
  return salespeople.map((sp) => {
    const entries = commissions.filter((c) => c.salesperson === sp.name)
    const pending = entries.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionValue, 0)
    const approved = entries.filter((c) => c.status === 'approved').reduce((s, c) => s + c.commissionValue, 0)
    const paid = entries.filter((c) => c.status === 'paid').reduce((s, c) => s + c.commissionValue, 0)
    const totalSales = entries.reduce((s, c) => s + c.orderTotal, 0)
    return {
      name: sp.name,
      email: sp.email,
      phone: sp.phone,
      commissionRate: sp.commissionRate,
      totalSales,
      pending,
      approved,
      paid,
      total: pending + approved + paid,
    }
  })
}

export default function ComissoesPage() {
  const summaries = buildSummaries()
  const totalPending = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.commissionValue, 0)
  const totalApproved = commissions
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + c.commissionValue, 0)
  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.commissionValue, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comissoes"
        description="Gestao de vendedores e comissoes"
      />

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatBRL(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissions.filter((c) => c.status === 'pending').length} comissoes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatBRL(totalApproved)}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissions.filter((c) => c.status === 'approved').length} comissoes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatBRL(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissions.filter((c) => c.status === 'paid').length} comissoes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Visão Geral + Comissões */}
      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visao Geral</TabsTrigger>
          <TabsTrigger value="comissoes">Comissoes</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral — salesperson cards with contact + stats */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summaries.map((sp) => (
              <Card key={sp.name} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {sp.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{sp.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className="mt-1 border-0 bg-green-100 text-green-800 font-medium"
                        >
                          {sp.commissionRate}% comissao
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Contact info */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{sp.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{sp.phone}</span>
                    </div>
                  </div>

                  {/* Sales stats */}
                  <div className="grid grid-cols-2 gap-3 border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Vendas</p>
                      <p className="text-sm font-semibold">{formatBRL(sp.totalSales)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Comissao</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatBRL(sp.total)}
                      </p>
                    </div>
                  </div>

                  {/* Commission breakdown */}
                  <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
                    <div>
                      <p className="font-semibold text-yellow-600">{formatBRL(sp.pending)}</p>
                      <p className="text-muted-foreground">Pendente</p>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-600">{formatBRL(sp.approved)}</p>
                      <p className="text-muted-foreground">Aprovada</p>
                    </div>
                    <div>
                      <p className="font-semibold text-green-600">{formatBRL(sp.paid)}</p>
                      <p className="text-muted-foreground">Paga</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Comissões — detail table */}
        <TabsContent value="comissoes">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Valor Pedido</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead className="text-right">Comissao</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link
                          href="/pedidos"
                          className="text-primary hover:underline"
                        >
                          #{c.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{c.clientName}</TableCell>
                      <TableCell>{c.salesperson}</TableCell>
                      <TableCell className="text-right">{formatBRL(c.orderTotal)}</TableCell>
                      <TableCell className="text-right">{c.rate}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatBRL(c.commissionValue)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} type="commission" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
