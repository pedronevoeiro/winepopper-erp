'use client'

import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  trade_name: string | null
  is_mirror_stock: boolean
}

interface Product {
  id: string
  name: string
  sku: string | null
}

interface MirrorMapping {
  id: string
  source_company_id: string
  source_product_id: string
  source_variation_id: string | null
  target_company_id: string
  target_product_id: string
  target_variation_id: string | null
  quantity_ratio: number
  active: boolean
  source_company: { id: string; name: string; trade_name: string | null } | null
  source_product: { id: string; name: string; sku: string | null } | null
  target_company: { id: string; name: string; trade_name: string | null } | null
  target_product: { id: string; name: string; sku: string | null } | null
}

export default function EspelhosPage() {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [mirrorCompany, setMirrorCompany] = useState<Company | null>(null)
  const [realCompany, setRealCompany] = useState<Company | null>(null)
  const [mappings, setMappings] = useState<MirrorMapping[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New mapping form
  const [newSourceProductId, setNewSourceProductId] = useState('')
  const [newTargetProductId, setNewTargetProductId] = useState('')
  const [newQuantityRatio, setNewQuantityRatio] = useState('1')
  const [searchSource, setSearchSource] = useState('')
  const [searchTarget, setSearchTarget] = useState('')

  const loadCompanies = useCallback(async () => {
    const res = await fetch('/api/companies')
    const json = await res.json()
    const comps = json.data ?? []
    setCompanies(comps)

    const mirror = comps.find((c: Company) => c.is_mirror_stock)
    const real = comps.find((c: Company) => !c.is_mirror_stock)
    setMirrorCompany(mirror ?? null)
    setRealCompany(real ?? null)

    return { mirror, real }
  }, [])

  const loadMappings = useCallback(async (sourceCompanyId: string) => {
    const res = await fetch(`/api/product-mirrors?source_company_id=${sourceCompanyId}`)
    const json = await res.json()
    setMappings(json.data ?? [])
  }, [])

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/products')
    const json = await res.json()
    setProducts(json.data ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const { mirror } = await loadCompanies()
      await loadProducts()
      if (mirror) {
        await loadMappings(mirror.id)
      }
      setLoading(false)
    }
    init()
  }, [loadCompanies, loadMappings, loadProducts])

  async function handleSave() {
    if (!mirrorCompany || !realCompany || !newSourceProductId || !newTargetProductId) {
      setError('Selecione o produto de origem e destino.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/product-mirrors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_company_id: mirrorCompany.id,
          source_product_id: newSourceProductId,
          target_company_id: realCompany.id,
          target_product_id: newTargetProductId,
          quantity_ratio: parseFloat(newQuantityRatio) || 1,
        }),
      })

      if (res.ok) {
        setShowDialog(false)
        setNewSourceProductId('')
        setNewTargetProductId('')
        setNewQuantityRatio('1')
        setSearchSource('')
        setSearchTarget('')
        await loadMappings(mirrorCompany.id)
      } else {
        const json = await res.json()
        setError(json.error || 'Erro ao salvar mapeamento.')
      }
    } catch {
      setError('Erro de conexao.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(mappingId: string) {
    if (!mirrorCompany) return

    const res = await fetch(`/api/product-mirrors?id=${mappingId}`, { method: 'DELETE' })
    if (res.ok) {
      await loadMappings(mirrorCompany.id)
    }
  }

  const filteredSourceProducts = products.filter(
    (p) =>
      !searchSource ||
      p.name.toLowerCase().includes(searchSource.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchSource.toLowerCase()))
  )

  const filteredTargetProducts = products.filter(
    (p) =>
      !searchTarget ||
      p.name.toLowerCase().includes(searchTarget.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTarget.toLowerCase()))
  )

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
        <PageHeader title="Produtos Espelho" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de Produtos Espelho</CardTitle>
          <CardDescription>
            Configure quais produtos da empresa com estoque ficticio
            ({mirrorCompany?.trade_name || mirrorCompany?.name || 'N/A'})
            correspondem a quais produtos reais da empresa
            ({realCompany?.trade_name || realCompany?.name || 'N/A'}).
            Quando um pedido for criado pela empresa ficticia, o sistema usara esses mapeamentos
            para gerar automaticamente a baixa espelho no estoque real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!mirrorCompany && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
              Nenhuma empresa configurada como estoque ficticio. Marque uma empresa com
              <Badge variant="secondary" className="mx-1">is_mirror_stock = true</Badge>
              no banco de dados.
            </div>
          )}

          {mirrorCompany && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{mirrorCompany.trade_name || mirrorCompany.name}</Badge>
                  <span>(ficticio)</span>
                  <ArrowRight className="h-4 w-4" />
                  <Badge variant="outline">{realCompany?.trade_name || realCompany?.name || '?'}</Badge>
                  <span>(real)</span>
                </div>
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Mapeamento
                </Button>
              </div>

              {mappings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum mapeamento configurado. Clique em &quot;Novo Mapeamento&quot; para comecar.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto Ficticio ({mirrorCompany.trade_name || mirrorCompany.name})</TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Produto Real ({realCompany?.trade_name || realCompany?.name})</TableHead>
                      <TableHead className="w-24 text-center">Proporcao</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{m.source_product?.name ?? 'Produto desconhecido'}</div>
                            {m.source_product?.sku && (
                              <div className="text-sm text-muted-foreground">{m.source_product.sku}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{m.target_product?.name ?? 'Produto desconhecido'}</div>
                            {m.target_product?.sku && (
                              <div className="text-sm text-muted-foreground">{m.target_product.sku}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{m.quantity_ratio}:1</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(m.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para novo mapeamento */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Mapeamento Espelho</DialogTitle>
            <DialogDescription>
              Selecione o produto da {mirrorCompany?.trade_name || 'empresa ficticia'} e
              qual produto real da {realCompany?.trade_name || 'empresa real'} ele corresponde.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Produto Ficticio ({mirrorCompany?.trade_name || mirrorCompany?.name})</Label>
              <Input
                placeholder="Buscar produto..."
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value)}
              />
              <Select value={newSourceProductId} onValueChange={setNewSourceProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto de origem" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSourceProducts.slice(0, 50).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku ? `[${p.sku}] ` : ''}{p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>Produto Real ({realCompany?.trade_name || realCompany?.name})</Label>
              <Input
                placeholder="Buscar produto..."
                value={searchTarget}
                onChange={(e) => setSearchTarget(e.target.value)}
              />
              <Select value={newTargetProductId} onValueChange={setNewTargetProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto de destino" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTargetProducts.slice(0, 50).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku ? `[${p.sku}] ` : ''}{p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Proporcao (quantidade)</Label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={newQuantityRatio}
                onChange={(e) => setNewQuantityRatio(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ex: 1 = para cada 1 unidade ficticia, baixa 1 real. 2 = cada 1 ficticio baixa 2 reais.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Mapeamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
