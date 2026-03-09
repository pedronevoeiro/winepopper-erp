'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { formatBRL } from '@/lib/constants'

interface SupplierOption {
  id: string
  name: string
}

interface ProductOption {
  id: string
  name: string
  sku: string | null
  cost_price: number
}

interface OrderItem {
  product_id: string
  quantity: number
  unit_cost_estimated: number
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none'

export default function NovaCompraPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])

  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<OrderItem[]>([
    { product_id: '', quantity: 1, unit_cost_estimated: 0 },
  ])

  useEffect(() => {
    // Fetch suppliers
    fetch('/api/contacts?type=supplier')
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : json.data ?? []
        setSuppliers(
          data.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        )
      })
      .catch(() => {})

    // Fetch insumos for item selection
    fetch('/api/products?type=insumo')
      .then((r) => r.json())
      .then((json) => {
        const data = json.data ?? json
        const list = Array.isArray(data) ? data : []
        setProducts(
          list.map((p: { id: string; name: string; sku: string | null; cost_price: number }) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            cost_price: p.cost_price ?? 0,
          }))
        )
      })
      .catch(() => {})
  }, [])

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev]
      if (field === 'product_id') {
        updated[index] = { ...updated[index], product_id: value as string }
        // Auto-fill cost when product selected
        const product = products.find((p) => p.id === value)
        if (product) {
          updated[index].unit_cost_estimated = product.cost_price
        }
      } else if (field === 'quantity') {
        updated[index] = { ...updated[index], quantity: Number(value) || 0 }
      } else {
        updated[index] = { ...updated[index], unit_cost_estimated: Number(value) || 0 }
      }
      return updated
    })
  }

  function addItem() {
    setItems((prev) => [...prev, { product_id: '', quantity: 1, unit_cost_estimated: 0 }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totalEstimated = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost_estimated,
    0
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!supplierId) {
      setError('Selecione um fornecedor.')
      return
    }

    const validItems = items.filter((i) => i.product_id && i.quantity > 0)
    if (validItems.length === 0) {
      setError('Adicione pelo menos um item com produto e quantidade.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId,
          expected_date: expectedDate || null,
          notes: notes || null,
          items: validItems,
        }),
      })

      if (res.ok) {
        router.push('/compras')
      } else {
        const json = await res.json()
        setError(json.error || 'Erro ao criar pedido.')
      }
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Pedido de Compra"
        actions={
          <Link href="/compras">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Supplier and Date */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">
                  Fornecedor <span className="text-red-500">*</span>
                </Label>
                <select
                  id="supplier"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">Selecione um fornecedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_date">Data Prevista de Entrega</Label>
                <Input
                  id="expected_date"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="notes">Observacoes</Label>
              <Textarea
                id="notes"
                placeholder="Observacoes sobre o pedido..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="relative grid gap-3 rounded-md border p-4 md:grid-cols-4"
              >
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Remover item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Product */}
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">
                    Insumo <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={item.product_id}
                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Selecione um insumo...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku ? `[${p.sku}] ` : ''}
                        {p.name} — R$ {p.cost_price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    Quantidade <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  />
                </div>

                {/* Unit Cost */}
                <div className="space-y-1">
                  <Label className="text-xs">Custo Unit. (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_cost_estimated}
                    onChange={(e) => updateItem(index, 'unit_cost_estimated', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>

              {items.some((i) => i.product_id && i.quantity > 0) && (
                <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-2">
                  <p className="text-sm font-medium text-teal-800">
                    Total Estimado: {formatBRL(totalEstimated)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/compras">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Criar Pedido'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
