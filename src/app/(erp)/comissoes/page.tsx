'use client'

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
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatBRL } from '@/lib/constants'
import type { ErpCommissionStatus } from '@/types/database'

interface CommissionEntry {
  id: string
  orderNumber: number
  salesperson: string
  orderTotal: number
  rate: number
  commissionValue: number
  status: ErpCommissionStatus
}

interface SalespersonSummary {
  name: string
  pending: number
  approved: number
  paid: number
  total: number
}

const commissions: CommissionEntry[] = [
  {
    id: '1',
    orderNumber: 1001,
    salesperson: 'Carlos Mendes',
    orderTotal: 45000,
    rate: 5,
    commissionValue: 2250,
    status: 'paid',
  },
  {
    id: '2',
    orderNumber: 1002,
    salesperson: 'Ana Oliveira',
    orderTotal: 62000,
    rate: 6,
    commissionValue: 3720,
    status: 'paid',
  },
  {
    id: '3',
    orderNumber: 1003,
    salesperson: 'Roberto Santos',
    orderTotal: 38000,
    rate: 4.5,
    commissionValue: 1710,
    status: 'approved',
  },
  {
    id: '4',
    orderNumber: 1004,
    salesperson: 'Carlos Mendes',
    orderTotal: 55000,
    rate: 5,
    commissionValue: 2750,
    status: 'approved',
  },
  {
    id: '5',
    orderNumber: 1005,
    salesperson: 'Ana Oliveira',
    orderTotal: 71000,
    rate: 6,
    commissionValue: 4260,
    status: 'pending',
  },
  {
    id: '6',
    orderNumber: 1006,
    salesperson: 'Roberto Santos',
    orderTotal: 42000,
    rate: 4.5,
    commissionValue: 1890,
    status: 'pending',
  },
  {
    id: '7',
    orderNumber: 1007,
    salesperson: 'Carlos Mendes',
    orderTotal: 87500,
    rate: 5,
    commissionValue: 4375,
    status: 'pending',
  },
  {
    id: '8',
    orderNumber: 1008,
    salesperson: 'Ana Oliveira',
    orderTotal: 92000,
    rate: 6,
    commissionValue: 5520,
    status: 'paid',
  },
  {
    id: '9',
    orderNumber: 1009,
    salesperson: 'Roberto Santos',
    orderTotal: 62000,
    rate: 4.5,
    commissionValue: 2790,
    status: 'paid',
  },
]

function buildSummaries(entries: CommissionEntry[]): SalespersonSummary[] {
  const map = new Map<string, SalespersonSummary>()
  entries.forEach((e) => {
    if (!map.has(e.salesperson)) {
      map.set(e.salesperson, {
        name: e.salesperson,
        pending: 0,
        approved: 0,
        paid: 0,
        total: 0,
      })
    }
    const s = map.get(e.salesperson)!
    if (e.status === 'pending') s.pending += e.commissionValue
    if (e.status === 'approved') s.approved += e.commissionValue
    if (e.status === 'paid') s.paid += e.commissionValue
    s.total += e.commissionValue
  })
  return Array.from(map.values())
}

export default function ComissoesPage() {
  const summaries = buildSummaries(commissions)
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
        description="Calculo e gestao de comissoes de vendedores"
      />

      {/* Global summary cards */}
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

      {/* Per-salesperson summary cards */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Resumo por Vendedor</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {summaries.map((sp) => (
            <Card key={sp.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {sp.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <CardTitle className="text-base">{sp.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
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
                <div className="mt-3 border-t pt-2 text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-bold">{formatBRL(sp.total)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Commissions table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Detalhamento de Comissoes</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
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
                    <TableCell className="font-medium">#{c.orderNumber}</TableCell>
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
      </div>
    </div>
  )
}
