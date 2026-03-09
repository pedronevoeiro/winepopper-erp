'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS } from '@/lib/constants'
import type { ErpProductType } from '@/types/database'

// ── Zod schema ──────────────────────────────────────────────
const UNIT_OPTIONS = [
  { value: 'un', label: 'un (unidade)' },
  { value: 'pç', label: 'pç (peça)' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g (grama)' },
  { value: 'L', label: 'L (litro)' },
  { value: 'ml', label: 'ml' },
  { value: 'm', label: 'm (metro)' },
  { value: 'cm', label: 'cm' },
  { value: 'cx', label: 'cx (caixa)' },
  { value: 'rolo', label: 'rolo' },
  { value: 'folha', label: 'folha' },
  { value: 'par', label: 'par' },
]

const componentSchema = z.object({
  component_id: z.string().min(1, 'Selecione um componente'),
  qty_per_unit: z.coerce.number().min(0, 'Deve ser >= 0'),
  total_needed: z.coerce.number().min(0),
  unit: z.string().default('un'),
  stock_available: z.number().optional(),
})

const formSchema = z.object({
  product_id: z.string().min(1, 'Selecione um produto'),
  variation_id: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantidade deve ser no minimo 1'),
  components: z.array(componentSchema),
  assigned_workers: z.array(z.string()),
  planned_date: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

// ── Interfaces ──────────────────────────────────────────────
interface Product {
  id: string
  name: string
  sku: string | null
  product_type: ErpProductType
}

interface Variation {
  id: string
  product_id: string
  name: string
  sku: string | null
}

interface BomComponent {
  id: string
  component_id: string
  quantity: number // qty per unit
  unit?: string
  component_name?: string
  component_sku?: string | null
  stock_available?: number
}

interface Worker {
  id: string
  name: string
  role: string | null
  active: boolean
}

// ── Page ────────────────────────────────────────────────────
export default function NovaOrdemProducaoPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [variations, setVariations] = useState<Variation[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([]) // for extra component picker
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingBom, setLoadingBom] = useState(false)
  const [loadingWorkers, setLoadingWorkers] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      product_id: '',
      variation_id: '',
      quantity: 1,
      components: [],
      assigned_workers: [],
      planned_date: '',
      notes: '',
    },
  })

  const { fields, replace, append, remove } = useFieldArray({
    control: form.control,
    name: 'components',
  })

  const watchQuantity = form.watch('quantity')
  const watchProductId = form.watch('product_id')

  // Fetch products (produto_final + insumo)
  useEffect(() => {
    async function fetchProducts() {
      try {
        const [resFinal, resInsumo] = await Promise.all([
          fetch('/api/products?type=produto_final'),
          fetch('/api/products?type=insumo'),
        ])
        const jsonFinal = await resFinal.json()
        const jsonInsumo = await resInsumo.json()
        const finalProds: Product[] = (
          Array.isArray(jsonFinal) ? jsonFinal : jsonFinal.data ?? []
        ).map((p: Product) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          product_type: p.product_type,
        }))
        const insumoProds: Product[] = (
          Array.isArray(jsonInsumo) ? jsonInsumo : jsonInsumo.data ?? []
        ).map((p: Product) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          product_type: p.product_type,
        }))
        const combined = [...finalProds, ...insumoProds]
        setProducts(combined)
        setAllProducts(combined)
      } catch (err) {
        console.error('Erro ao carregar produtos:', err)
      } finally {
        setLoadingProducts(false)
      }
    }
    fetchProducts()
  }, [])

  // Fetch workers
  useEffect(() => {
    fetch('/api/production-workers')
      .then((res) => res.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : json.data ?? []
        setWorkers(data.filter((w: Worker) => w.active))
      })
      .catch(console.error)
      .finally(() => setLoadingWorkers(false))
  }, [])

  // Fetch BOM when product changes
  const fetchBom = useCallback(
    async (productId: string) => {
      if (!productId) {
        replace([])
        setVariations([])
        return
      }
      setLoadingBom(true)
      try {
        // Fetch BOM
        const bomRes = await fetch(`/api/bom?product_id=${productId}`)
        const bomJson = await bomRes.json()
        const bomData: BomComponent[] = Array.isArray(bomJson)
          ? bomJson
          : bomJson.data ?? []

        const qty = form.getValues('quantity') || 1
        const newComponents = bomData.map((b) => ({
          component_id: b.component_id,
          qty_per_unit: b.quantity,
          total_needed: b.quantity * qty,
          unit: b.unit ?? 'un',
          stock_available: b.stock_available ?? 0,
        }))
        replace(newComponents)

        // Fetch variations
        const varRes = await fetch(`/api/products/${productId}/variations`)
        const varJson = await varRes.json()
        setVariations(Array.isArray(varJson) ? varJson : varJson.data ?? [])
      } catch (err) {
        console.error('Erro ao carregar BOM:', err)
        replace([])
        setVariations([])
      } finally {
        setLoadingBom(false)
      }
    },
    [form, replace]
  )

  useEffect(() => {
    if (watchProductId) {
      fetchBom(watchProductId)
      form.setValue('variation_id', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchProductId])

  // Recalculate total_needed when quantity changes
  useEffect(() => {
    const currentComponents = form.getValues('components')
    if (currentComponents.length > 0) {
      const updated = currentComponents.map((c) => ({
        ...c,
        total_needed: c.qty_per_unit * (watchQuantity || 1),
      }))
      replace(updated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchQuantity])

  // Resolve component name from allProducts
  function getComponentName(componentId: string): string {
    const p = allProducts.find((prod) => prod.id === componentId)
    return p ? p.name : componentId
  }

  // Selected product info
  const selectedProduct = products.find((p) => p.id === watchProductId)

  // Handle form submit
  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        product_id: values.product_id,
        variation_id: values.variation_id || null,
        quantity: values.quantity,
        components: values.components.map((c) => ({
          component_id: c.component_id,
          required_qty: c.total_needed,
          unit: c.unit || 'un',
        })),
        assigned_workers: values.assigned_workers,
        planned_date: values.planned_date || null,
        notes: values.notes || null,
      }

      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar ordem de producao')
      }

      router.push('/producao')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Erro ao criar ordem de producao')
    } finally {
      setSubmitting(false)
    }
  }

  // Add extra component row
  function handleAddComponent() {
    append({
      component_id: '',
      qty_per_unit: 1,
      total_needed: watchQuantity || 1,
      unit: 'un',
      stock_available: 0,
    })
  }

  // Toggle worker
  function toggleWorker(workerId: string) {
    const current = form.getValues('assigned_workers')
    if (current.includes(workerId)) {
      form.setValue(
        'assigned_workers',
        current.filter((id) => id !== workerId)
      )
    } else {
      form.setValue('assigned_workers', [...current, workerId])
    }
  }

  const selectedWorkers = form.watch('assigned_workers')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Ordem de Producao"
        description="Crie uma nova ordem de producao"
        actions={
          <Link href="/producao">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Produto */}
          <Card>
            <CardHeader>
              <CardTitle>Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto a Produzir</FormLabel>
                    <div className="flex items-center gap-3">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingProducts}
                      >
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue
                              placeholder={
                                loadingProducts
                                  ? 'Carregando produtos...'
                                  : 'Selecione um produto'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                              {product.sku ? ` (${product.sku})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProduct && (
                        <Badge
                          variant="secondary"
                          className={`border-0 shrink-0 ${
                            PRODUCT_TYPE_COLORS[selectedProduct.product_type]
                          }`}
                        >
                          {PRODUCT_TYPE_LABELS[selectedProduct.product_type]}
                        </Badge>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {variations.length > 0 && (
                <FormField
                  control={form.control}
                  name="variation_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variacao</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma variacao (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {variations.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                              {v.sku ? ` (${v.sku})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Section 2: Componentes (BOM) */}
          <Card>
            <CardHeader>
              <CardTitle>Componentes (BOM)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingBom ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : fields.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {watchProductId
                    ? 'Este produto nao possui BOM cadastrada. Adicione componentes manualmente.'
                    : 'Selecione um produto para carregar os componentes.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="w-[110px]">Unidade</TableHead>
                      <TableHead className="text-right w-[120px]">
                        Qtd por Un.
                      </TableHead>
                      <TableHead className="text-right w-[130px]">
                        Total Necessario
                      </TableHead>
                      <TableHead className="text-right w-[130px]">
                        Estoque Disponivel
                      </TableHead>
                      <TableHead className="w-[70px] text-center">
                        Status
                      </TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const component = form.watch(`components.${index}`)
                      const stockOk =
                        (component.stock_available ?? 0) >=
                        component.total_needed

                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            {component.component_id ? (
                              <span className="font-medium">
                                {getComponentName(component.component_id)}
                              </span>
                            ) : (
                              <Select
                                value={component.component_id}
                                onValueChange={(val) =>
                                  form.setValue(
                                    `components.${index}.component_id`,
                                    val
                                  )
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {allProducts.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={component.unit || 'un'}
                              onValueChange={(val) =>
                                form.setValue(`components.${index}.unit`, val)
                              }
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_OPTIONS.map((u) => (
                                  <SelectItem key={u.value} value={u.value}>
                                    {u.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              className="w-[100px] ml-auto text-right"
                              value={component.qty_per_unit}
                              onChange={(e) => {
                                const newQpu = Number(e.target.value)
                                form.setValue(
                                  `components.${index}.qty_per_unit`,
                                  newQpu
                                )
                                form.setValue(
                                  `components.${index}.total_needed`,
                                  newQpu * (watchQuantity || 1)
                                )
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {component.total_needed}
                          </TableCell>
                          <TableCell className="text-right">
                            {component.stock_available ?? '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {stockOk ? (
                              <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="mx-auto h-5 w-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddComponent}
                className="w-full"
              >
                <Plus className="mr-1 h-3 w-3" />
                Adicionar Componente
              </Button>
            </CardContent>
          </Card>

          {/* Section 3: Meta de Producao */}
          <Card>
            <CardHeader>
              <CardTitle>Meta de Producao</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ex: 100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 4: Responsaveis */}
          <Card>
            <CardHeader>
              <CardTitle>Responsaveis</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkers ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-6 w-48 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : workers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum operario cadastrado. Cadastre operarios em Configuracoes.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {workers.map((worker) => {
                    const isChecked = selectedWorkers.includes(worker.id)
                    return (
                      <label
                        key={worker.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                          isChecked
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleWorker(worker.id)}
                        />
                        <div>
                          <div className="text-sm font-medium">
                            {worker.name}
                          </div>
                          {worker.role && (
                            <div className="text-xs text-muted-foreground">
                              {worker.role}
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Planejamento */}
          <Card>
            <CardHeader>
              <CardTitle>Planejamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="planned_date"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Data Planejada</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observacoes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informacoes adicionais sobre a ordem de producao..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting || loadingProducts}
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Criar Ordem de Producao
            </Button>
            <Link href="/producao">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </Form>
    </div>
  )
}
