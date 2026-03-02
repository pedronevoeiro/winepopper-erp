'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { formatBRL, formatDate } from '@/lib/constants'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import type { ErpFinancialEntry } from '@/types/database'

interface FinancialEntryWithContact extends ErpFinancialEntry {
  contact?: { name: string } | null
}

interface FinancialSummary {
  total_receivable_pending: number
  total_payable_pending: number
  balance: number
}

export default function CaixasPage() {
  const [entries, setEntries] = useState<FinancialEntryWithContact[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/financial')
      .then((res) => res.json())
      .then((json) => {
        setEntries(Array.isArray(json.data) ? json.data : [])
        setSummary(json.summary ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Cash flow: all entries sorted by due date, excluding cancelled
  const cashFlowItems = useMemo(
    () =>
      [...entries]
        .filter((e) => e.status !== 'cancelled')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [entries]
  )

  // Monthly totals (current month entries)
  const monthlyStats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const monthEntries = entries.filter((e) => {
      const dueDate = new Date(e.due_date)
      return dueDate >= startOfMonth && dueDate <= endOfMonth && e.status !== 'cancelled'
    })

    const entradas = monthEntries
      .filter((e) => e.type === 'receivable')
      .reduce((sum, e) => sum + e.amount, 0)

    const saidas = monthEntries
      .filter((e) => e.type === 'payable')
      .reduce((sum, e) => sum + e.amount, 0)

    return { entradas, saidas, saldo: entradas - saidas }
  }, [entries])

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {formatBRL(monthlyStats.entradas)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {formatBRL(monthlyStats.saidas)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div
                className={`text-2xl font-bold ${
                  monthlyStats.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatBRL(monthlyStats.saldo)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash flow table */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : cashFlowItems.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
            Nenhum lançamento no fluxo de caixa
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashFlowItems.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.due_date)}</TableCell>
                    <TableCell>
                      {entry.type === 'receivable' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <TrendingUp className="h-3 w-3" />
                          Entrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                          <TrendingDown className="h-3 w-3" />
                          Saída
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {entry.description}
                    </TableCell>
                    <TableCell>{entry.contact?.name ?? '-'}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        entry.type === 'receivable' ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {entry.type === 'receivable' ? '+' : '-'}
                      {formatBRL(entry.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} type="financial" />
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
