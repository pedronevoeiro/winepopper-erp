'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  formatBRL,
  formatDate,
  PAYMENT_METHOD_LABELS,
} from '@/lib/constants'
import { TrendingDown, AlertTriangle, CheckCircle, Plus } from 'lucide-react'
import type { ErpFinancialEntry, ErpPaymentAccount } from '@/types/database'

interface FinancialEntryWithContact extends ErpFinancialEntry {
  contact?: { name: string } | null
}

interface FinancialSummary {
  total_payable_pending: number
  total_payable_paid: number
  total_payable_overdue: number
}

export default function ContasAPagarPage() {
  const [entries, setEntries] = useState<FinancialEntryWithContact[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<ErpPaymentAccount[]>([])

  // Filters
  const [accountFilter, setAccountFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetch('/api/financial?type=payable')
      .then((res) => res.json())
      .then((json) => {
        setEntries(Array.isArray(json.data) ? json.data : [])
        setSummary(json.summary ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    fetch('/api/payment-accounts')
      .then((res) => res.json())
      .then((json) => setAccounts(Array.isArray(json.data) ? json.data : []))
      .catch(console.error)
  }, [])

  const filtered = useMemo(() => {
    let result = [...entries]
    if (accountFilter !== 'all') {
      result = result.filter((e) => e.account_id === accountFilter)
    }
    if (dateFrom) {
      result = result.filter((e) => e.due_date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((e) => e.due_date <= dateTo + 'T23:59:59Z')
    }
    return result
  }, [entries, accountFilter, dateFrom, dateTo])

  const accountName = (id: string | null) => {
    if (!id) return null
    return accounts.find((a) => a.id === id)?.name ?? null
  }

  return (
    <div className="space-y-6">
      {/* Header with button */}
      <div className="flex items-center justify-between">
        <div />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Conta a Pagar
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Em breve</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Conta</Label>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.filter((a) => a.active).map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ate</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
        {(accountFilter !== 'all' || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAccountFilter('all'); setDateFrom(''); setDateTo('') }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {formatBRL(summary?.total_payable_pending ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">
                {formatBRL(summary?.total_payable_paid ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {formatBRL(summary?.total_payable_overdue ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
            Nenhuma conta a pagar encontrada
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {entry.description}
                    </TableCell>
                    <TableCell>{entry.contact?.name ?? '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(entry.amount)}
                      {entry.paid_amount > 0 && entry.paid_amount < entry.amount && (
                        <span className="block text-xs text-muted-foreground">
                          Pago: {formatBRL(entry.paid_amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(entry.due_date)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {accountName(entry.account_id) ?? '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} type="financial" />
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.payment_method
                        ? PAYMENT_METHOD_LABELS[entry.payment_method] ?? entry.payment_method
                        : '-'}
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
