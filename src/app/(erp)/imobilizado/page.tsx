'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Building, Package, CheckCircle } from 'lucide-react'
import type { ErpProductType, ErpProductVariation } from '@/types/database'

interface ProductWithStock {
  id: string
  sku: string | null
  name: string
  description: string | null
  product_type: ErpProductType
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
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ImobilizadoPage() {
  const [assets, setAssets] = useState<ProductWithStock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products?type=ativo_imobilizado')
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json
        setAssets(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalAssets = assets.length
  const totalValue = assets.reduce((sum, a) => sum + (a.cost_price ?? 0), 0)
  const activeCount = assets.filter((a) => a.active).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ativo Imobilizado"
        description="Maquinas, equipamentos e bens patrimoniais"
        actions={
          <Link href="/produtos/novo?type=ativo_imobilizado">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Ativo
            </Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Ativos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAssets}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBRL(totalValue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Table or empty state */}
          {assets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Building className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">Nenhum ativo imobilizado encontrado</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre maquinas, equipamentos e bens patrimoniais.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-mono text-xs">
                          {asset.sku || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {asset.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {asset.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(asset.cost_price)}
                        </TableCell>
                        <TableCell>
                          {asset.active ? (
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
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
