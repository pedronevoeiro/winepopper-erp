'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ProductTypeBadge } from '@/components/shared/ProductTypeBadge'
import { ProductStructureBadge } from '@/components/shared/ProductStructureBadge'
import { formatBRL, formatDate } from '@/lib/constants'
import {
  ArrowLeft, Save, Trash2, Loader2, Plus, X, AlertCircle,
  Package, Layers, Users2, Boxes, CheckCircle, AlertTriangle, Link2, ArrowRight,
} from 'lucide-react'
import type { ErpProductType, ErpProductStructure, ErpProductVariation, ErpContact, ErpStock, ErpStockMovement, ErpCompany, ErpProductMirror } from '@/types/database'

// ── Types ──────────────────────────────────────────────────
interface BomComponentEnriched {
  id: string
  parent_id: string
  component_id: string
  quantity: number
  notes: string | null
  component_name: string
  component_sku: string | null
  component_cost: number
  stock_available: number
}

interface ProductDetail {
  id: string
  sku: string | null
  name: string
  description: string | null
  product_type: ErpProductType
  structure: ErpProductStructure
  supplier_id: string | null
  cost_price: number
  sell_price: number
  weight_grams: number
  height_cm: number
  width_cm: number
  length_cm: number
  category: string | null
  brand: string | null
  material: string | null
  ncm: string | null
  cest: string | null
  origin: number
  cfop_venda: string
  images: string[]
  active: boolean
  manage_stock: boolean
  is_kit: boolean
  created_at: string
  updated_at: string
  variations: ErpProductVariation[]
  bom_components: BomComponentEnriched[]
  stock: ErpStock[]
  supplier: ErpContact | null
  stock_movements: ErpStockMovement[]
}

interface InsumoOption {
  id: string
  name: string
  sku: string | null
  cost_price: number
}

interface SupplierOption {
  id: string
  name: string
  document: string
  email: string | null
  phone: string | null
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none'

// ── Component ──────────────────────────────────────────────
export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Editable form state (Dados Gerais)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [productType, setProductType] = useState<ErpProductType>('produto_final')
  const [structure, setStructure] = useState<ErpProductStructure>('simples')
  const [material, setMaterial] = useState('')
  const [sellPrice, setSellPrice] = useState(0)
  const [costPrice, setCostPrice] = useState(0)
  const [weightG, setWeightG] = useState(0)
  const [widthCm, setWidthCm] = useState(0)
  const [heightCm, setHeightCm] = useState(0)
  const [lengthCm, setLengthCm] = useState(0)
  const [ncm, setNcm] = useState('')
  const [cfop, setCfop] = useState('')
  const [cest, setCest] = useState('')
  const [origin, setOrigin] = useState(0)
  const [active, setActive] = useState(true)

  // Supplier
  const [supplierId, setSupplierId] = useState<string>('')
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])

  // BOM
  const [insumos, setInsumos] = useState<InsumoOption[]>([])
  const [bomEditing, setBomEditing] = useState(false)
  const [bomRows, setBomRows] = useState<{ component_id: string; quantity: number }[]>([])
  const [bomSaving, setBomSaving] = useState(false)

  // Variation add
  const [newVarName, setNewVarName] = useState('')
  const [newVarSku, setNewVarSku] = useState('')
  const [addingVar, setAddingVar] = useState(false)

  // Mirror product
  const [companies, setCompanies] = useState<ErpCompany[]>([])
  const [mirrorMappings, setMirrorMappings] = useState<(ErpProductMirror & { source_company?: { id: string; name: string; trade_name: string | null }; target_company?: { id: string; name: string; trade_name: string | null }; source_product?: { id: string; name: string; sku: string | null }; target_product?: { id: string; name: string; sku: string | null } })[]>([])
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; sku: string | null }[]>([])
  const [mirrorTargetProductId, setMirrorTargetProductId] = useState('')
  const [mirrorQuantityRatio, setMirrorQuantityRatio] = useState(1)
  const [savingMirror, setSavingMirror] = useState(false)
  const [mirrorSearch, setMirrorSearch] = useState('')

  const fetchProduct = useCallback(() => {
    setLoading(true)
    fetch(`/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((json) => {
        const p = json.data as ProductDetail
        setProduct(p)
        // Populate form state
        setName(p.name)
        setSku(p.sku || '')
        setDescription(p.description || '')
        setProductType(p.product_type)
        setStructure(p.structure)
        setMaterial(p.material || '')
        setSellPrice(p.sell_price)
        setCostPrice(p.cost_price)
        setWeightG(p.weight_grams)
        setWidthCm(p.width_cm)
        setHeightCm(p.height_cm)
        setLengthCm(p.length_cm)
        setNcm(p.ncm || '')
        setCfop(p.cfop_venda || '')
        setCest(p.cest || '')
        setOrigin(p.origin)
        setActive(p.active)
        setSupplierId(p.supplier_id || '')
        setBomRows(p.bom_components.map((b) => ({ component_id: b.component_id, quantity: b.quantity })))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchProduct() }, [fetchProduct])

  // Fetch suppliers
  useEffect(() => {
    fetch('/api/contacts?type=supplier')
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : json.data ?? []
        setSuppliers(data.map((c: ErpContact) => ({
          id: c.id, name: c.name, document: c.document, email: c.email, phone: c.phone,
        })))
      })
      .catch(() => {})
  }, [])

  // Fetch companies
  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then((json) => setCompanies(json.data ?? []))
      .catch(() => {})
  }, [])

  // Fetch mirror mappings for this product
  const fetchMirrors = useCallback(() => {
    fetch('/api/product-mirrors')
      .then((r) => r.json())
      .then((json) => {
        const all = json.data ?? []
        // Find mappings where this product is either source or target
        const relevant = all.filter((m: ErpProductMirror) =>
          m.source_product_id === id || m.target_product_id === id
        )
        setMirrorMappings(relevant)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => { fetchMirrors() }, [fetchMirrors])

  // Fetch all produto_final for mirror selection
  useEffect(() => {
    fetch('/api/products?type=produto_final')
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : json.data ?? []
        setAllProducts(data.map((p: { id: string; name: string; sku: string | null }) => ({
          id: p.id, name: p.name, sku: p.sku,
        })))
      })
      .catch(() => {})
  }, [])

  // Fetch insumos for BOM
  useEffect(() => {
    fetch('/api/products?type=insumo')
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : json.data ?? []
        setInsumos(data.map((p: { id: string; name: string; sku: string | null; cost_price: number }) => ({
          id: p.id, name: p.name, sku: p.sku, cost_price: p.cost_price,
        })))
      })
      .catch(() => {})
  }, [])

  // Save general data
  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, sku: sku || null, description: description || null,
          product_type: productType, structure, material: material || null,
          sell_price: sellPrice, cost_price: costPrice,
          weight_grams: weightG, width_cm: widthCm, height_cm: heightCm, length_cm: lengthCm,
          ncm: ncm || null, cfop_venda: cfop || null, cest: cest || null, origin,
          active, supplier_id: supplierId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar')
      }
      fetchProduct()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // Delete product
  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      router.push('/produtos')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  // Save BOM
  async function handleSaveBom() {
    setBomSaving(true)
    try {
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: id,
          components: bomRows.filter((r) => r.component_id),
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar composicao')

      // Auto-calculate cost price from BOM
      const totalCost = bomRows.reduce((sum, row) => {
        const ins = insumos.find((i) => i.id === row.component_id)
        return sum + (ins?.cost_price ?? 0) * row.quantity
      }, 0)

      // Update cost price on the product
      await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost_price: totalCost }),
      })

      setBomEditing(false)
      fetchProduct()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar composicao')
    } finally {
      setBomSaving(false)
    }
  }

  // Add variation
  async function handleAddVariation() {
    if (!newVarName.trim()) return
    setAddingVar(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add_variations: [{ name: newVarName, sku: newVarSku || null }],
        }),
      })
      if (!res.ok) throw new Error('Erro ao adicionar variacao')
      setNewVarName('')
      setNewVarSku('')
      fetchProduct()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao adicionar variacao')
    } finally {
      setAddingVar(false)
    }
  }

  // Remove variation
  async function handleRemoveVariation(varId: string) {
    if (!window.confirm('Remover esta variacao?')) return
    try {
      await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove_variation_ids: [varId] }),
      })
      fetchProduct()
    } catch {
      alert('Erro ao remover variacao')
    }
  }

  // Save mirror mapping
  async function handleSaveMirror() {
    if (!mirrorTargetProductId) return
    setSavingMirror(true)
    try {
      // Find mirror company (is_mirror_stock=true) and real company
      const mirrorCompany = companies.find((c) => c.is_mirror_stock)
      const realCompany = companies.find((c) => !c.is_mirror_stock)
      if (!mirrorCompany || !realCompany) {
        alert('Necessario ter uma empresa real e uma empresa espelho cadastradas.')
        return
      }

      const res = await fetch('/api/product-mirrors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_company_id: mirrorCompany.id,
          source_product_id: id,
          target_company_id: realCompany.id,
          target_product_id: mirrorTargetProductId,
          quantity_ratio: mirrorQuantityRatio,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar espelho')
      }
      setMirrorTargetProductId('')
      setMirrorQuantityRatio(1)
      setMirrorSearch('')
      fetchMirrors()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar espelho')
    } finally {
      setSavingMirror(false)
    }
  }

  // Remove mirror mapping
  async function handleRemoveMirror(mirrorId: string) {
    if (!window.confirm('Remover este vinculo de produto espelho?')) return
    try {
      await fetch(`/api/product-mirrors?id=${mirrorId}`, { method: 'DELETE' })
      fetchMirrors()
    } catch {
      alert('Erro ao remover espelho')
    }
  }

  // Compute BOM total cost
  const bomTotalCost = bomRows.reduce((sum, row) => {
    const ins = insumos.find((i) => i.id === row.component_id)
    return sum + (ins?.cost_price ?? 0) * row.quantity
  }, 0)

  // Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Produto" actions={<Link href="/produtos"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button></Link>} />
        <Card><CardContent className="space-y-3 pt-6">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-6 w-full" />))}</CardContent></Card>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="space-y-6">
        <PageHeader title="Produto" actions={<Link href="/produtos"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button></Link>} />
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Produto nao encontrado</h3>
        </CardContent></Card>
      </div>
    )
  }

  const selectedSupplier = suppliers.find((s) => s.id === supplierId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={product.sku ? `SKU: ${product.sku}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <ProductTypeBadge type={product.product_type} />
            <ProductStructureBadge structure={product.structure} />
            <Link href="/produtos"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button></Link>
          </div>
        }
      />

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral"><Package className="mr-1.5 h-3.5 w-3.5" />Dados Gerais</TabsTrigger>
          <TabsTrigger value="fornecedor"><Users2 className="mr-1.5 h-3.5 w-3.5" />Fornecedor</TabsTrigger>
          {(structure === 'composto' || structure === 'com_variacoes') && (
            <TabsTrigger value="estrutura"><Layers className="mr-1.5 h-3.5 w-3.5" />Estrutura</TabsTrigger>
          )}
          {structure === 'com_variacoes' && (
            <TabsTrigger value="variacoes">Variacoes</TabsTrigger>
          )}
          <TabsTrigger value="estoque"><Boxes className="mr-1.5 h-3.5 w-3.5" />Estoque</TabsTrigger>
        </TabsList>

        {/* ============================================================
            TAB: Dados Gerais
        ============================================================ */}
        <TabsContent value="geral" className="mt-4 space-y-6">
          {/* Tipo e Estrutura */}
          <Card>
            <CardHeader><CardTitle>Tipo e Estrutura</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select value={productType} onChange={(e) => setProductType(e.target.value as ErpProductType)} className={selectClassName}>
                    <option value="produto_final">Produto Final</option>
                    <option value="insumo">Insumo</option>
                    <option value="ativo_imobilizado">Ativo Imobilizado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Estrutura</Label>
                  <select value={structure} onChange={(e) => setStructure(e.target.value as ErpProductStructure)} className={selectClassName}>
                    <option value="simples">Simples</option>
                    <option value="composto">Composto (com BOM)</option>
                    <option value="com_variacoes">Com Variacoes</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informacoes Basicas */}
          <Card>
            <CardHeader><CardTitle>Informacoes Basicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome <span className="text-red-500">*</span></Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: PFWP001" />
                </div>
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Input value={material} onChange={(e) => setMaterial(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Precos */}
          <Card>
            <CardHeader><CardTitle>Precos</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Preco de Venda (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={sellPrice} onChange={(e) => setSellPrice(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Preco de Custo (R$){(structure === 'composto' || structure === 'com_variacoes') && <span className="text-xs text-muted-foreground ml-2">(calculado pela BOM)</span>}</Label>
                  <Input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dimensoes */}
          <Card>
            <CardHeader><CardTitle>Dimensoes e Peso</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Peso (g)</Label>
                  <Input type="number" min="0" value={weightG} onChange={(e) => setWeightG(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Largura (cm)</Label>
                  <Input type="number" step="0.1" min="0" value={widthCm} onChange={(e) => setWidthCm(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Altura (cm)</Label>
                  <Input type="number" step="0.1" min="0" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Profundidade (cm)</Label>
                  <Input type="number" step="0.1" min="0" value={lengthCm} onChange={(e) => setLengthCm(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados Fiscais */}
          <Card>
            <CardHeader><CardTitle>Dados Fiscais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>NCM</Label>
                  <Input value={ncm} onChange={(e) => setNcm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CFOP</Label>
                  <Input value={cfop} onChange={(e) => setCfop(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CEST</Label>
                  <Input value={cest} onChange={(e) => setCest(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <select value={origin} onChange={(e) => setOrigin(Number(e.target.value))} className={selectClassName}>
                    <option value={0}>0 - Nacional</option>
                    <option value={1}>1 - Estrangeira (importacao direta)</option>
                    <option value={2}>2 - Estrangeira (mercado interno)</option>
                    <option value={8}>8 - Nacional (acima 70% importado)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produto Espelho (Mirror) */}
          {productType === 'produto_final' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Produto Vinculado (Espelho)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Vincule este produto a outro produto final. Quando um pedido da Hamecon der baixa, ambos os produtos terao o estoque reduzido na mesma quantidade.
                </p>

                {/* Existing mirrors */}
                {mirrorMappings.length > 0 && (
                  <div className="space-y-2">
                    {mirrorMappings.map((m) => {
                      const isSource = m.source_product_id === id
                      const linkedProduct = isSource ? m.target_product : m.source_product
                      const linkedCompany = isSource ? m.target_company : m.source_company
                      return (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="secondary" className="border-0 bg-blue-100 text-blue-800">
                                {isSource ? 'Espelho' : 'Real'}
                              </Badge>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                              <div>
                                <span className="font-medium">{linkedProduct?.name ?? 'Produto removido'}</span>
                                {linkedProduct?.sku && <span className="ml-2 text-xs text-muted-foreground">[{linkedProduct.sku}]</span>}
                                <span className="ml-2 text-xs text-muted-foreground">({linkedCompany?.trade_name || linkedCompany?.name})</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.quantity_ratio !== 1 && (
                              <Badge variant="outline" className="text-xs">Ratio: {m.quantity_ratio}x</Badge>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveMirror(m.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add new mirror */}
                {mirrorMappings.length === 0 && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Produto Vinculado</Label>
                      <Input
                        placeholder="Buscar produto por nome ou SKU..."
                        value={mirrorSearch}
                        onChange={(e) => {
                          setMirrorSearch(e.target.value)
                          setMirrorTargetProductId('')
                        }}
                      />
                      {mirrorSearch.length >= 2 && !mirrorTargetProductId && (
                        <div className="max-h-40 overflow-y-auto rounded-md border">
                          {allProducts
                            .filter((p) => p.id !== id && (
                              p.name.toLowerCase().includes(mirrorSearch.toLowerCase()) ||
                              (p.sku && p.sku.toLowerCase().includes(mirrorSearch.toLowerCase()))
                            ))
                            .slice(0, 10)
                            .map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                                onClick={() => {
                                  setMirrorTargetProductId(p.id)
                                  setMirrorSearch(p.sku ? `[${p.sku}] ${p.name}` : p.name)
                                }}
                              >
                                {p.sku && <span className="font-mono text-xs text-muted-foreground mr-2">[{p.sku}]</span>}
                                {p.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="space-y-2 w-32">
                        <Label className="text-xs">Proporcao (Qtd)</Label>
                        <Input type="number" step="0.01" min="0.01" value={mirrorQuantityRatio}
                          onChange={(e) => setMirrorQuantityRatio(Number(e.target.value))} />
                      </div>
                      <Button onClick={handleSaveMirror} disabled={savingMirror || !mirrorTargetProductId} size="sm">
                        {savingMirror ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Link2 className="mr-1 h-3 w-3" />}
                        Vincular
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={active} onCheckedChange={setActive} />
                  <Label>Produto ativo</Label>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />Excluir Produto
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alteracoes
            </Button>
          </div>
        </TabsContent>

        {/* ============================================================
            TAB: Fornecedor
        ============================================================ */}
        <TabsContent value="fornecedor" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Fornecedor Principal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-2">
                <Label>Fornecedor</Label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">Nenhum fornecedor selecionado</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {selectedSupplier && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-medium">{selectedSupplier.name}</h4>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div><span className="text-muted-foreground">Documento:</span> {selectedSupplier.document}</div>
                    {selectedSupplier.email && <div><span className="text-muted-foreground">Email:</span> {selectedSupplier.email}</div>}
                    {selectedSupplier.phone && <div><span className="text-muted-foreground">Telefone:</span> {selectedSupplier.phone}</div>}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            TAB: Estrutura / Composicao (BOM)
        ============================================================ */}
        {(structure === 'composto' || structure === 'com_variacoes') && (
          <TabsContent value="estrutura" className="mt-4 space-y-4">
            {/* Cost summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-primary">{formatBRL(product.cost_price)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Custo de Producao Atual</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold">{product.bom_components.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Componentes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold">{formatBRL(product.sell_price - product.cost_price)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Margem por Unidade</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Lista de Materiais (BOM)</CardTitle>
                {!bomEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setBomEditing(true)}>Editar BOM</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setBomEditing(false); setBomRows(product.bom_components.map((b) => ({ component_id: b.component_id, quantity: b.quantity }))) }}>Cancelar</Button>
                    <Button size="sm" onClick={handleSaveBom} disabled={bomSaving}>
                      {bomSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                      Salvar BOM
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {bomEditing ? (
                  <div className="space-y-3">
                    {bomRows.map((row, idx) => {
                      const ins = insumos.find((i) => i.id === row.component_id)
                      return (
                        <div key={idx} className="grid gap-3 items-end md:grid-cols-[2fr_1fr_1fr_1fr_auto] rounded-md border p-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Insumo</Label>
                            <select
                              value={row.component_id}
                              onChange={(e) => {
                                const newRows = [...bomRows]
                                newRows[idx].component_id = e.target.value
                                setBomRows(newRows)
                              }}
                              className={selectClassName}
                            >
                              <option value="">Selecione...</option>
                              {insumos.map((i) => <option key={i.id} value={i.id}>{i.sku ? `[${i.sku}] ` : ''}{i.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Qtd/Un.</Label>
                            <Input type="number" step="0.01" min="0.01" value={row.quantity}
                              onChange={(e) => { const newRows = [...bomRows]; newRows[idx].quantity = Number(e.target.value); setBomRows(newRows) }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Custo Unit.</Label>
                            <div className="text-sm font-medium pt-2">{ins ? formatBRL(ins.cost_price) : '-'}</div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Subtotal</Label>
                            <div className="text-sm font-medium pt-2">{ins ? formatBRL(ins.cost_price * row.quantity) : '-'}</div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setBomRows(bomRows.filter((_, i) => i !== idx))} className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                    <Button type="button" variant="outline" size="sm" onClick={() => setBomRows([...bomRows, { component_id: '', quantity: 1 }])}>
                      <Plus className="mr-1 h-3 w-3" />Adicionar Componente
                    </Button>
                    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
                      <span className="text-sm text-muted-foreground">Custo Total de Producao:</span>
                      <span className="ml-2 text-lg font-bold text-primary">{formatBRL(bomTotalCost)}</span>
                    </div>
                  </div>
                ) : product.bom_components.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum componente cadastrado. Clique em &quot;Editar BOM&quot; para definir a composicao.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-right">Qtd/Un.</TableHead>
                        <TableHead className="text-right">Custo Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.bom_components.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <div className="font-medium">{b.component_name}</div>
                            {b.component_sku && <div className="text-xs text-muted-foreground">{b.component_sku}</div>}
                          </TableCell>
                          <TableCell className="text-right">{b.quantity}</TableCell>
                          <TableCell className="text-right">{formatBRL(b.component_cost)}</TableCell>
                          <TableCell className="text-right font-medium">{formatBRL(b.component_cost * b.quantity)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className={`border-0 font-medium ${b.stock_available > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {b.stock_available} un.
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={3} className="text-right">Total:</TableCell>
                        <TableCell className="text-right text-primary font-bold">
                          {formatBRL(product.bom_components.reduce((sum, b) => sum + b.component_cost * b.quantity, 0))}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ============================================================
            TAB: Variacoes
        ============================================================ */}
        {structure === 'com_variacoes' && (
          <TabsContent value="variacoes" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Variacoes ({product.variations.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.variations.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhuma variacao cadastrada.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Custo Adic.</TableHead>
                        <TableHead className="text-right">Preco Adic.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.variations.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell className="font-mono text-xs">{v.sku || '-'}</TableCell>
                          <TableCell className="text-right">{v.additional_cost > 0 ? formatBRL(v.additional_cost) : '-'}</TableCell>
                          <TableCell className="text-right">{v.additional_price > 0 ? formatBRL(v.additional_price) : '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`border-0 font-medium ${v.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                              {v.active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveVariation(v.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Add variation */}
                <div className="flex items-end gap-3 rounded-lg border p-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Nome da Variacao</Label>
                    <Input value={newVarName} onChange={(e) => setNewVarName(e.target.value)} placeholder="Ex: Prata" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">SKU</Label>
                    <Input value={newVarSku} onChange={(e) => setNewVarSku(e.target.value)} placeholder="Ex: PFWP001-PRT" />
                  </div>
                  <Button onClick={handleAddVariation} disabled={addingVar || !newVarName.trim()} size="sm">
                    {addingVar ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ============================================================
            TAB: Estoque
        ============================================================ */}
        <TabsContent value="estoque" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {product.stock.length === 0 ? (
              <Card className="md:col-span-full">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma entrada de estoque para este produto.
                </CardContent>
              </Card>
            ) : (
              product.stock.map((s) => {
                const available = s.quantity - s.reserved
                const isLow = available <= s.min_quantity
                const isEmpty = available <= 0
                const colorClass = isEmpty ? 'border-red-200 bg-red-50' : isLow ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'
                const textColor = isEmpty ? 'text-red-700' : isLow ? 'text-yellow-700' : 'text-green-700'
                const variation = s.variation_id ? product.variations.find((v) => v.id === s.variation_id) : null

                return (
                  <Card key={s.id} className={`border ${colorClass}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{variation ? variation.name : 'Estoque Geral'}</CardTitle>
                        {isEmpty ? <AlertTriangle className={`h-4 w-4 ${textColor}`} /> : isLow ? <AlertTriangle className={`h-4 w-4 ${textColor}`} /> : <CheckCircle className={`h-4 w-4 ${textColor}`} />}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${textColor}`}>{available} un.</div>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                        <div><p className="font-semibold">{s.quantity}</p><p className="text-muted-foreground">Total</p></div>
                        <div><p className="font-semibold">{s.reserved}</p><p className="text-muted-foreground">Reservado</p></div>
                        <div><p className="font-semibold">{s.min_quantity}</p><p className="text-muted-foreground">Minimo</p></div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Stock label */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {product.product_type === 'insumo' ? 'Estoque para Industrializacao' : 'Estoque para Venda'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {product.product_type === 'insumo'
                  ? 'Este insumo e consumido em ordens de producao para fabricar produtos finais.'
                  : 'Este produto acabado e destinado a venda e envio aos clientes.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Produto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &quot;{product.name}&quot;? Esta acao nao pode ser desfeita. Variacoes, BOM e estoque associados tambem serao removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
