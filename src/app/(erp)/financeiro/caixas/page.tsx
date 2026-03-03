'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatBRL, formatDate } from '@/lib/constants'
import { TrendingUp, TrendingDown, DollarSign, Upload, X } from 'lucide-react'
import type { ErpFinancialEntry, ErpPaymentAccount } from '@/types/database'
import { parseOFX, type OFXTransaction } from '@/lib/ofx-parser'

interface FinancialEntryWithContact extends ErpFinancialEntry {
  contact?: { name: string } | null
}

export default function CaixasPage() {
  const [entries, setEntries] = useState<FinancialEntryWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<ErpPaymentAccount[]>([])

  // Filters
  const [accountFilter, setAccountFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // OFX
  const [ofxTransactions, setOfxTransactions] = useState<OFXTransaction[]>([])
  const [ofxFileName, setOfxFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/financial')
      .then((res) => res.json())
      .then((json) => {
        setEntries(Array.isArray(json.data) ? json.data : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    fetch('/api/payment-accounts')
      .then((res) => res.json())
      .then((json) => setAccounts(Array.isArray(json.data) ? json.data : []))
      .catch(console.error)
  }, [])

  // Cash flow: filtered, excluding cancelled
  const cashFlowItems = useMemo(() => {
    let result = entries.filter((e) => e.status !== 'cancelled')
    if (accountFilter !== 'all') {
      result = result.filter((e) => e.account_id === accountFilter)
    }
    if (dateFrom) {
      result = result.filter((e) => e.due_date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((e) => e.due_date <= dateTo + 'T23:59:59Z')
    }
    return result.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  }, [entries, accountFilter, dateFrom, dateTo])

  // Monthly totals based on filtered items
  const monthlyStats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const monthEntries = cashFlowItems.filter((e) => {
      const dueDate = new Date(e.due_date)
      return dueDate >= startOfMonth && dueDate <= endOfMonth
    })

    const entradas = monthEntries
      .filter((e) => e.type === 'receivable')
      .reduce((sum, e) => sum + e.amount, 0)

    const saidas = monthEntries
      .filter((e) => e.type === 'payable')
      .reduce((sum, e) => sum + e.amount, 0)

    return { entradas, saidas, saldo: entradas - saidas }
  }, [cashFlowItems])

  // OFX upload handler
  function handleOFXUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOfxFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const transactions = parseOFX(content)
      setOfxTransactions(transactions)
    }
    reader.readAsText(file, 'ISO-8859-1')
    e.target.value = ''
  }

  // Check if OFX transaction matches any existing entry
  function isReconciled(txn: OFXTransaction): boolean {
    const txnAmount = Math.abs(txn.amount)
    const txnDate = new Date(txn.date)
    return entries.some((entry) => {
      const entryAmount = entry.amount
      const entryDate = new Date(entry.due_date)
      const daysDiff = Math.abs(txnDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      return Math.abs(txnAmount - entryAmount) < 0.01 && daysDiff <= 3
    })
  }

  const accountName = (id: string | null) => {
    if (!id) return null
    return accounts.find((a) => a.id === id)?.name ?? null
  }

  return (
    <div className="space-y-6">
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Importar OFX
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ofx"
          className="hidden"
          onChange={handleOFXUpload}
        />
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
            <CardTitle className="text-sm font-medium">Entradas do Mes</CardTitle>
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
            <CardTitle className="text-sm font-medium">Saidas do Mes</CardTitle>
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

      {/* OFX Reconciliation */}
      {ofxTransactions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conciliacao Bancaria — {ofxFileName}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => { setOfxTransactions([]); setOfxFileName('') }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ofxTransactions.map((txn, i) => {
                  const reconciled = isReconciled(txn)
                  return (
                    <TableRow key={txn.fitid || i}>
                      <TableCell>{txn.date}</TableCell>
                      <TableCell>
                        {txn.amount >= 0 ? (
                          <span className="text-xs font-medium text-green-700">Credito</span>
                        ) : (
                          <span className="text-xs font-medium text-red-700">Debito</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">{txn.memo}</TableCell>
                      <TableCell className={`text-right font-medium ${txn.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatBRL(Math.abs(txn.amount))}
                      </TableCell>
                      <TableCell>
                        {reconciled ? (
                          <Badge variant="secondary" className="border-0 bg-green-100 text-green-800 font-medium">
                            Conciliado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="border-0 bg-yellow-100 text-yellow-800 font-medium">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
            Nenhum lancamento no fluxo de caixa
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
                  <TableHead>Descricao</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Conta</TableHead>
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
                          Saida
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {entry.description}
                    </TableCell>
                    <TableCell>{entry.contact?.name ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {accountName(entry.account_id) ?? '-'}
                    </TableCell>
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
