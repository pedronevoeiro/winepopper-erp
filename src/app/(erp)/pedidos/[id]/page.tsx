'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatBRL,
  formatDate,
} from '@/lib/constants'
import { ArrowLeft, Package, Building2, CheckCircle2, Loader2 } from 'lucide-react'
import type { ErpOrderStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OrderDetail {
  id: string
  order_number: number
  status: ErpOrderStatus
  order_date: string
  expected_date: string | null
  subtotal: number
  discount_value: number
  shipping_cost: number
  other_costs: number
  total: number
  payment_method: string | null
  payment_condition: string | null
  notes: string | null
  company_id: string | null
  contact?: { id: string; name: string; document: string; email: string | null; phone: string | null }
  salesperson?: { name: string }
  company?: { id: string; name: string; trade_name: string | null; document: string }
  items?: OrderItem[]
}

interface OrderItem {
  id: string
  product_id: string
  variation_id: string | null
  description: string | null
  sku: string | null
  quantity: number
  unit_price: number
  total: number
}

interface CompanyOption {
  id: string
  name: string
  trade_name: string | null
  document: string
}

interface WarehouseOption {
  id: string
  name: string
  code: string
}

interface ProductOption {
  id: string
  name: string
  sku: string | null
}

interface WriteoffRow {
  order_item_id: string
  item_description: string
  item_quantity: number
  product_id: string
  company_id: string
  warehouse_id: string
  quantity: number
  enable_mirror: boolean
  mirror_product_id: string
  mirror_company_id: string
  mirror_warehouse_id: string
  mirror_quantity: number
}

interface ExistingWriteoff {
  id: string
  product_id: string
  product_name: string
  product_sku: string | null
  company_id: string
  company_name: string
  warehouse_name: string
  quantity: number
  is_mirror: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [writeoffRows, setWriteoffRows] = useState<WriteoffRow[]>([])
  const [existingWriteoffs, setExistingWriteoffs] = useState<ExistingWriteoff[]>([])
  const [submittingWriteoff, setSubmittingWriteoff] = useState(false)
  const [writeoffSuccess, setWriteoffSuccess] = useState<string | null>(null)
  const [writeoffError, setWriteoffError] = useState<string | null>(null)

  const selectClassName =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none'

  // Fetch order detail
  useEffect(() => {
    setLoading(true)
    fetch(`/api/sales-orders?id=${id}`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json
        const orders = Array.isArray(data) ? data : [data]
        const found = orders.find((o: OrderDetail) => o.id === id) ?? orders[0]
        setOrder(found || null)

        // Initialize writeoff rows from order items
        if (found?.items?.length) {
          setWriteoffRows(
            found.items.map((item: OrderItem) => ({
              order_item_id: item.id,
              item_description: item.description || item.sku || 'Item',
              item_quantity: item.quantity,
              product_id: item.product_id,
              company_id: found.company_id || '',
              warehouse_id: '',
              quantity: item.quantity,
              enable_mirror: false,
              mirror_product_id: '',
              mirror_company_id: '',
              mirror_warehouse_id: '',
              mirror_quantity: item.quantity,
            }))
          )
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Fetch companies
    fetch('/api/companies')
      .then((res) => res.json())
      .then((json) => setCompanies(json.data ?? []))
      .catch(console.error)

    // Fetch warehouses
    fetch('/api/warehouses')
      .then((res) => res.json())
      .then((json) => setWarehouses(json.data ?? []))
      .catch(console.error)

    // Fetch products
    fetch('/api/products')
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json
        setProducts(
          (Array.isArray(data) ? data : []).map((p: ProductOption) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
          }))
        )
      })
      .catch(console.error)

    // Fetch existing writeoffs
    fetch(`/api/stock-writeoffs?sales_order_id=${id}`)
      .then((res) => res.json())
      .then((json) => setExistingWriteoffs(json.data ?? []))
      .catch(console.error)
  }, [id])

  // Set default warehouse
  useEffect(() => {
    if (warehouses.length > 0 && writeoffRows.length > 0) {
      const defaultWh = warehouses[0].id
      setWriteoffRows((prev) =>
        prev.map((row) => ({
          ...row,
          warehouse_id: row.warehouse_id || defaultWh,
          mirror_warehouse_id: row.mirror_warehouse_id || defaultWh,
        }))
      )
    }
  }, [warehouses, writeoffRows.length])

  function updateWriteoffRow(index: number, updates: Partial<WriteoffRow>) {
    setWriteoffRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    )
  }

  // Find other company for mirror
  function getOtherCompanyId(currentCompanyId: string): string {
    const other = companies.find((c) => c.id !== currentCompanyId)
    return other?.id ?? ''
  }

  async function handleSubmitWriteoff() {
    setSubmittingWriteoff(true)
    setWriteoffError(null)
    setWriteoffSuccess(null)

    try {
      const writeoffs: Array<Record<string, unknown>> = []

      for (const row of writeoffRows) {
        if (!row.product_id || !row.company_id || !row.warehouse_id || row.quantity <= 0) continue

        // Primary writeoff
        writeoffs.push({
          order_item_id: row.order_item_id,
          product_id: row.product_id,
          company_id: row.company_id,
          warehouse_id: row.warehouse_id,
          quantity: row.quantity,
          is_mirror: false,
        })

        // Mirror writeoff (if enabled)
        if (row.enable_mirror && row.mirror_product_id && row.mirror_company_id && row.mirror_warehouse_id && row.mirror_quantity > 0) {
          writeoffs.push({
            order_item_id: row.order_item_id,
            product_id: row.mirror_product_id,
            company_id: row.mirror_company_id,
            warehouse_id: row.mirror_warehouse_id,
            quantity: row.mirror_quantity,
            is_mirror: true,
            notes: 'Baixa espelho - Easy Wine',
          })
        }
      }

      if (writeoffs.length === 0) {
        setWriteoffError('Nenhuma baixa configurada.')
        return
      }

      const res = await fetch('/api/stock-writeoffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_order_id: id,
          writeoffs,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        setWriteoffSuccess(`Baixa realizada com sucesso! ${json.count} registro(s) criado(s).`)

        // Refresh existing writeoffs
        const woRes = await fetch(`/api/stock-writeoffs?sales_order_id=${id}`)
        const woJson = await woRes.json()
        setExistingWriteoffs(woJson.data ?? [])
      } else {
        const json = await res.json()
        setWriteoffError(json.error || 'Erro ao processar baixa.')
      }
    } catch {
      setWriteoffError('Erro de conexao. Tente novamente.')
    } finally {
      setSubmittingWriteoff(false)
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

  if (!order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pedido nao encontrado" />
        <p className="text-muted-foreground">O pedido solicitado nao foi encontrado.</p>
        <Link href="/pedidos">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
    )
  }

  const orderCompanyName = order.company?.trade_name || order.company?.name || 'N/A'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pedido #${order.order_number}`}
        actions={
          <Link href="/pedidos">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      {/* Order info cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={order.status} type="order" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{orderCompanyName}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-bold">{formatBRL(order.total)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Customer info */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{order.contact?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data do Pedido</p>
              <p className="font-medium">{formatDate(order.order_date)}</p>
            </div>
            {order.salesperson && (
              <div>
                <p className="text-sm text-muted-foreground">Vendedor</p>
                <p className="font-medium">{order.salesperson.name}</p>
              </div>
            )}
            {order.payment_method && (
              <div>
                <p className="text-sm text-muted-foreground">Pagamento</p>
                <p className="font-medium">{order.payment_method}</p>
              </div>
            )}
          </div>
          {order.notes && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Observacoes</p>
              <p className="text-sm mt-1">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order items */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Preco Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(order.items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.description || 'Produto'}
                  </TableCell>
                  <TableCell>{item.sku || '-'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatBRL(item.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Existing writeoffs */}
      {existingWriteoffs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Baixas Realizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Deposito</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingWriteoffs.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell>{wo.product_name}{wo.product_sku ? ` [${wo.product_sku}]` : ''}</TableCell>
                    <TableCell>{wo.company_name}</TableCell>
                    <TableCell>{wo.warehouse_name}</TableCell>
                    <TableCell className="text-right">{wo.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={wo.is_mirror ? 'outline' : 'secondary'}>
                        {wo.is_mirror ? 'Espelho' : 'Principal'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(wo.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Stock writeoff section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Baixa de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {writeoffSuccess && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {writeoffSuccess}
            </div>
          )}

          {writeoffError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {writeoffError}
            </div>
          )}

          {writeoffRows.map((row, index) => (
            <div key={row.order_item_id} className="rounded-md border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {row.item_description} — Qtd: {row.item_quantity}
                </p>
              </div>

              {/* Primary writeoff */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Baixa Principal ({orderCompanyName})
                </p>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Produto</Label>
                    <select
                      className={selectClassName}
                      value={row.product_id}
                      onChange={(e) => updateWriteoffRow(index, { product_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku ? `[${p.sku}] ` : ''}{p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Empresa</Label>
                    <select
                      className={selectClassName}
                      value={row.company_id}
                      onChange={(e) => updateWriteoffRow(index, { company_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.trade_name || c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Deposito</Label>
                    <select
                      className={selectClassName}
                      value={row.warehouse_id}
                      onChange={(e) => updateWriteoffRow(index, { warehouse_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          [{w.code}] {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade</Label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.quantity}
                      onChange={(e) => updateWriteoffRow(index, { quantity: Number(e.target.value) })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Mirror writeoff toggle */}
              <div className="border-t pt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`mirror-${index}`}
                    checked={row.enable_mirror}
                    onChange={(e) => {
                      const enable = e.target.checked
                      updateWriteoffRow(index, {
                        enable_mirror: enable,
                        mirror_company_id: enable ? getOtherCompanyId(row.company_id) : '',
                        mirror_product_id: enable ? row.product_id : '',
                        mirror_warehouse_id: enable ? row.warehouse_id : '',
                        mirror_quantity: enable ? row.quantity : 0,
                      })
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={`mirror-${index}`} className="text-sm font-medium cursor-pointer">
                    Baixar tambem no estoque da outra empresa
                  </label>
                </div>

                {row.enable_mirror && (
                  <div className="mt-3 space-y-3 rounded-md border border-dashed p-3 bg-muted/30">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Baixa Espelho (outra empresa)
                    </p>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Produto</Label>
                        <select
                          className={selectClassName}
                          value={row.mirror_product_id}
                          onChange={(e) => updateWriteoffRow(index, { mirror_product_id: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku ? `[${p.sku}] ` : ''}{p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Empresa</Label>
                        <select
                          className={selectClassName}
                          value={row.mirror_company_id}
                          onChange={(e) => updateWriteoffRow(index, { mirror_company_id: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.trade_name || c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Deposito</Label>
                        <select
                          className={selectClassName}
                          value={row.mirror_warehouse_id}
                          onChange={(e) => updateWriteoffRow(index, { mirror_warehouse_id: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              [{w.code}] {w.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Quantidade</Label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.mirror_quantity}
                          onChange={(e) => updateWriteoffRow(index, { mirror_quantity: Number(e.target.value) })}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {writeoffRows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum item no pedido para baixa.
            </p>
          )}

          {writeoffRows.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitWriteoff}
                disabled={submittingWriteoff}
              >
                {submittingWriteoff ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirmar Baixa de Estoque
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
