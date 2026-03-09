'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBRL } from '@/lib/constants'
import { ProductTypeBadge } from '@/components/shared/ProductTypeBadge'
import { ProductStructureBadge } from '@/components/shared/ProductStructureBadge'
import { ProducibleIndicator } from '@/components/shared/ProducibleIndicator'
import { Plus, Package, AlertTriangle, CheckCircle } from 'lucide-react'
import type { ErpProductType, ErpProductStructure, ErpProductVariation } from '@/types/database'

interface ProductWithStock {
  id: string
  sku: string | null
  name: string
  description: string | null
  product_type: ErpProductType
  structure: ErpProductStructure
  material: string | null
  sell_price: number
  cost_price: number
  active: boolean
  variations: ErpProductVariation[]
  stock_quantity: number
  stock_reserved: number
  stock_available: number
  min_quantity: number
  producible_quantity: number
  stock?: {
    quantity: number
    reserved: number
    min_quantity: number
    warehouse_name: string
    variation_id: string | null
  }[]
}

function getStockColor(available: number, minQty: number) {
  if (available <= 0) return 'red'
  if (available <= minQty) return 'yellow'
  return 'green'
}

const stockColorMap = {
  red: {
    bg: 'bg-red-50 border-red-200',
    bar: 'bg-red-500',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
  },
  yellow: {
    bg: 'bg-yellow-50 border-yellow-200',
    bar: 'bg-yellow-500',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  green: {
    bg: 'bg-green-50 border-green-200',
    bar: 'bg-green-500',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
  },
}

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge
      variant="secondary"
      className="border-0 bg-green-100 font-medium text-green-800"
    >
      Ativo
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="border-0 bg-gray-100 font-medium text-gray-700"
    >
      Inativo
    </Badge>
  )
}

function StockBadge({ available, minQty }: { available: number; minQty: number }) {
  const color = getStockColor(available, minQty)
  const colors = stockColorMap[color]
  return (
    <Badge
      variant="secondary"
      className={`border-0 font-medium ${colors.badge}`}
    >
      {available} un.
    </Badge>
  )
}

function getDisplaySku(product: ProductWithStock): string {
  if (product.variations.length > 0) {
    const firstActive = product.variations.find((v) => v.active)
    return firstActive?.sku || product.sku || '-'
  }
  return product.sku || '-'
}

function StockCard({
  product,
  variation,
}: {
  product: ProductWithStock
  variation?: ErpProductVariation
}) {
  const color = getStockColor(product.stock_available, product.min_quantity)
  const colors = stockColorMap[color]
  const maxBar = Math.max(product.stock_available, product.min_quantity, 1)
  const barWidth = Math.min((product.stock_available / maxBar) * 100, 100)
  const purposeLabel =
    product.product_type === 'insumo' ? 'Industrializacao' : 'Venda'

  return (
    <Card className={`border ${colors.bg}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {product.name}
              {variation && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  - {variation.name}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground font-mono">
                {variation?.sku || product.sku || '-'}
              </p>
              <ProductTypeBadge type={product.product_type} />
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {purposeLabel}
              </Badge>
            </div>
          </div>
          {color === 'green' ? (
            <CheckCircle className={`h-5 w-5 ${colors.text}`} />
          ) : (
            <AlertTriangle className={`h-5 w-5 ${colors.text}`} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className={`font-semibold ${colors.text}`}>
              {product.stock_available} disponivel
            </span>
            <span className="text-muted-foreground text-xs">
              min: {product.min_quantity}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full transition-all ${colors.bar}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="font-semibold">{product.stock_quantity}</p>
            <p className="text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="font-semibold">{product.stock_reserved}</p>
            <p className="text-muted-foreground">Reservado</p>
          </div>
          <div>
            <p className={`font-semibold ${colors.text}`}>
              {product.stock_available}
            </p>
            <p className="text-muted-foreground">Disponivel</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProdutosPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json
        setProducts(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const produtosFinais = products.filter((p) => p.product_type === 'produto_final')
  const insumos = products.filter((p) => p.product_type === 'insumo')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Cadastro de produtos, insumos e controle de estoque"
        actions={
          <Link href="/produtos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </Link>
        }
      />

      <Tabs defaultValue="produtos_finais">
        <TabsList>
          <TabsTrigger value="produtos_finais">
            Produtos Finais
            {!loading && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                {produtosFinais.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insumos">
            Insumos
            {!loading && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                {insumos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
        </TabsList>

        {/* ============================================================
            TAB: Produtos Finais
        ============================================================ */}
        <TabsContent value="produtos_finais" className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : produtosFinais.length === 0 ? (
            <EmptyState message="Cadastre seus produtos finais para comecar." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Estrutura</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Preco Venda</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead>Produzivel</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosFinais.map((product) => (
                      <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/produtos/${product.id}`)}>
                        <TableCell className="font-mono text-xs">
                          {getDisplaySku(product)}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {product.name}
                            {product.variations.length > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {product.variations.length} var.
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ProductStructureBadge structure={product.structure} />
                        </TableCell>
                        <TableCell>{product.material || '-'}</TableCell>
                        <TableCell className="text-right">
                          {formatBRL(product.sell_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <StockBadge
                            available={product.stock_available}
                            minQty={product.min_quantity}
                          />
                        </TableCell>
                        <TableCell>
                          <ProducibleIndicator quantity={product.producible_quantity} />
                        </TableCell>
                        <TableCell>
                          <ActiveBadge active={product.active} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================
            TAB: Insumos
        ============================================================ */}
        <TabsContent value="insumos" className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : insumos.length === 0 ? (
            <EmptyState message="Cadastre seus insumos para comecar." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insumos.map((product) => (
                      <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/produtos/${product.id}`)}>
                        <TableCell className="font-mono text-xs">
                          {product.sku || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(product.cost_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <StockBadge
                            available={product.stock_available}
                            minQty={product.min_quantity}
                          />
                        </TableCell>
                        <TableCell>
                          <ActiveBadge active={product.active} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================
            TAB: Estoque
        ============================================================ */}
        <TabsContent value="estoque" className="mt-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState message="Nenhum produto cadastrado." />
          ) : (
            <div className="space-y-8">
              {/* Insumos — Industrialização */}
              {insumos.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Insumos — Industrializacao
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {insumos.map((product) => (
                      <StockCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}

              {/* Produtos Acabados — Venda */}
              {produtosFinais.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Produtos Acabados — Venda
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {produtosFinais.map((product) => {
                      const hasVars = product.variations.length > 0
                      if (hasVars) {
                        return product.variations.map((variation) => (
                          <StockCard
                            key={`${product.id}-${variation.id}`}
                            product={product}
                            variation={variation}
                          />
                        ))
                      }
                      return <StockCard key={product.id} product={product} />
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
