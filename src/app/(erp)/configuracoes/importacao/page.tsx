'use client'

import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Download, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  trade_name: string | null
  is_mirror_stock?: boolean
}

interface BlingStatus {
  company_id: string
  connected: boolean
  has_credentials: boolean
}

interface ImportResultItem {
  module: string
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const MODULE_LABELS: Record<string, string> = {
  contacts: 'Contatos (Clientes e Fornecedores)',
  products: 'Produtos',
  stock: 'Estoque (Saldos)',
  sales_orders: 'Pedidos de Venda',
  financial: 'Financeiro (Contas a Receber/Pagar)',
  invoices: 'NF-e (Notas Fiscais)',
}

const MODULE_ORDER = ['contacts', 'products', 'stock', 'sales_orders', 'financial', 'invoices']

export default function ImportacaoPage() {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [blingStatuses, setBlingStatuses] = useState<BlingStatus[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResultItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [companiesRes, statusRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/bling/status'),
      ])

      const companiesJson = await companiesRes.json()
      setCompanies(companiesJson.data ?? [])

      if (statusRes.ok) {
        const statusJson = await statusRes.json()
        setBlingStatuses(statusJson.data ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)
  const blingStatus = blingStatuses.find((s) => s.company_id === selectedCompanyId)
  const isConnected = blingStatus?.connected === true

  function toggleModule(mod: string) {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  function selectAll() {
    setSelectedModules(MODULE_ORDER)
  }

  async function handleImport() {
    if (!selectedCompanyId || selectedModules.length === 0) return

    setImporting(true)
    setResults(null)
    setError(null)

    try {
      const res = await fetch('/api/bling/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompanyId,
          modules: selectedModules,
        }),
      })

      const json = await res.json()

      if (res.ok) {
        setResults(json.results ?? [])
      } else {
        setError(json.error || 'Erro ao executar importacao.')
      }
    } catch {
      setError('Erro de conexao com o servidor.')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/configuracoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title="Importar Dados do Bling" />
      </div>

      {/* Company selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Empresa</CardTitle>
          <CardDescription>
            Escolha a empresa cujos dados serao importados do Bling.
            Cada empresa deve ter suas proprias credenciais OAuth2 configuradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Selecione a empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.trade_name || c.name}
                    {c.is_mirror_stock ? ' (ficticio)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCompany && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status Bling:</span>
              {isConnected ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : blingStatus?.has_credentials ? (
                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Desconectado — reconecte em Configuracoes
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-700 border-red-300">
                  <XCircle className="h-3 w-3 mr-1" />
                  Sem credenciais — configure em Configuracoes
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module selection */}
      {selectedCompanyId && isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Modulos para Importar</CardTitle>
            <CardDescription>
              Selecione quais dados deseja importar. A importacao respeita a ordem:
              contatos primeiro, depois produtos, estoque, pedidos, financeiro e NF-e.
              Registros ja importados (por bling_id) serao ignorados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Selecionar Todos
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedModules([])}>
                Limpar
              </Button>
            </div>

            <div className="space-y-3">
              {MODULE_ORDER.map((mod) => (
                <div key={mod} className="flex items-center space-x-3">
                  <Checkbox
                    id={`mod-${mod}`}
                    checked={selectedModules.includes(mod)}
                    onChange={() => toggleModule(mod)}
                  />
                  <label
                    htmlFor={`mod-${mod}`}
                    className="text-sm font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {MODULE_LABELS[mod]}
                  </label>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button
                onClick={handleImport}
                disabled={importing || selectedModules.length === 0}
                className="w-full sm:w-auto"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando... (pode levar alguns minutos)
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Iniciar Importacao ({selectedModules.length} modulo{selectedModules.length > 1 ? 's' : ''})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-red-700">
              <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Erro na importacao</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Resultado da Importacao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modulo</TableHead>
                  <TableHead className="text-right">Criados</TableHead>
                  <TableHead className="text-right">Atualizados</TableHead>
                  <TableHead className="text-right">Ignorados</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.module}>
                    <TableCell className="font-medium">
                      {MODULE_LABELS[r.module] || r.module}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {r.created}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{r.updated}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{r.skipped}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.errors.length > 0 ? (
                        <Badge variant="destructive">{r.errors.length}</Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Error details */}
            {results.some((r) => r.errors.length > 0) && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-red-700">Detalhes dos erros:</p>
                <div className="max-h-48 overflow-y-auto rounded-md border border-red-200 bg-red-50 p-3">
                  {results.flatMap((r) =>
                    r.errors.map((err, i) => (
                      <p key={`${r.module}-${i}`} className="text-xs text-red-600 py-0.5">
                        [{MODULE_LABELS[r.module]}] {err}
                      </p>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">Total:</span>
                <span className="text-green-700">
                  {results.reduce((s, r) => s + r.created, 0)} criados
                </span>
                <span className="text-blue-700">
                  {results.reduce((s, r) => s + r.updated, 0)} atualizados
                </span>
                <span className="text-muted-foreground">
                  {results.reduce((s, r) => s + r.skipped, 0)} ignorados
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
