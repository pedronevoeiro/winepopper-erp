'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBRL } from '@/lib/constants'
import { TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react'

interface FinancialSummary {
  total_receivable: number
  total_receivable_pending: number
  total_receivable_paid: number
  total_receivable_overdue: number
  total_payable: number
  total_payable_pending: number
  total_payable_paid: number
  total_payable_overdue: number
  total_overdue: number
  total_paid: number
  balance: number
}

export default function FinanceiroPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/financial')
      .then((res) => res.json())
      .then((json) => setSummary(json.summary ?? null))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/financeiro/contas-a-receber" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total A Receber</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {formatBRL(summary?.total_receivable_pending ?? 0)}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    Ver detalhes
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro/contas-a-pagar" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total A Pagar</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {formatBRL(summary?.total_payable_pending ?? 0)}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    Ver detalhes
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro/caixas" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <div
                    className={`text-2xl font-bold ${
                      (summary?.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatBRL(summary?.balance ?? 0)}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    Ver fluxo de caixa
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Additional detail cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo de Recebimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recebido</span>
                  <span className="font-medium text-green-600">
                    {formatBRL(summary?.total_receivable_paid ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendente</span>
                  <span className="font-medium">
                    {formatBRL(summary?.total_receivable_pending ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vencido</span>
                  <span className="font-medium text-red-600">
                    {formatBRL(summary?.total_receivable_overdue ?? 0)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pago</span>
                  <span className="font-medium text-green-600">
                    {formatBRL(summary?.total_payable_paid ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendente</span>
                  <span className="font-medium">
                    {formatBRL(summary?.total_payable_pending ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vencido</span>
                  <span className="font-medium text-red-600">
                    {formatBRL(summary?.total_payable_overdue ?? 0)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
