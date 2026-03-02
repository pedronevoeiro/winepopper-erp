'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Plus, X, ImagePlus } from 'lucide-react'
import type { ErpProductType } from '@/types/database'

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const variationSchema = z.object({
  name: z.string().min(1, 'Nome da variacao e obrigatorio'),
  sku: z.string().optional(),
  additional_cost: z.coerce.number().min(0).default(0),
  additional_price: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
})

const bomComponentSchema = z.object({
  component_id: z.string().min(1, 'Selecione um insumo'),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
})

const imageEntrySchema = z.object({
  data_url: z.string(),
  file_name: z.string(),
  variation_assignment: z.string().default('geral'),
})

const productSchema = z
  .object({
    product_type: z.enum(['produto_final', 'insumo', 'ativo_imobilizado']).default('produto_final'),
    has_variations: z.boolean().default(false),
    sku: z.string().optional(),
    name: z.string().min(1, 'Nome e obrigatorio'),
    material: z.string().optional(),
    unit: z.string().min(1).default('un'),
    description: z.string().optional(),
    variations: z.array(variationSchema).default([]),
    sell_price: z.coerce.number().optional(),
    cost_price: z.coerce.number().optional(),
    weight_g: z.coerce.number().optional(),
    width_cm: z.coerce.number().optional(),
    height_cm: z.coerce.number().optional(),
    depth_cm: z.coerce.number().optional(),
    ncm: z.string().optional(),
    cfop: z.string().optional(),
    cest: z.string().optional(),
    origin: z.coerce.number().min(0).max(8).optional(),
    bom_components: z.array(bomComponentSchema).default([]),
    images: z.array(imageEntrySchema).default([]),
    min_stock: z.coerce.number().min(0).default(0),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    // SKU required when no variations
    if (!data.has_variations && (!data.sku || data.sku.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SKU e obrigatorio quando nao possui variacoes',
        path: ['sku'],
      })
    }
    // Sell price required for produto_final
    if (data.product_type === 'produto_final' && (!data.sell_price || data.sell_price <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Preco de venda e obrigatorio para produtos finais',
        path: ['sell_price'],
      })
    }
    // At least one variation when has_variations is on
    if (data.has_variations && data.variations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adicione pelo menos uma variacao',
        path: ['variations'],
      })
    }
  })

type ProductFormData = z.infer<typeof productSchema>

// ---------------------------------------------------------------------------
// Insumo (for BOM select) — simple type for fetched insumos
// ---------------------------------------------------------------------------
interface InsumoOption {
  id: string
  name: string
  sku: string | null
}

// ---------------------------------------------------------------------------
// Select styling (matches the project pattern from contatos/novo)
// ---------------------------------------------------------------------------
const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NovoProdutoPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insumos, setInsumos] = useState<InsumoOption[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as unknown as Resolver<ProductFormData>,
    defaultValues: {
      product_type: 'produto_final',
      has_variations: false,
      sku: '',
      name: '',
      material: '',
      unit: 'un',
      description: '',
      variations: [],
      sell_price: undefined,
      cost_price: undefined,
      weight_g: undefined,
      width_cm: undefined,
      height_cm: undefined,
      depth_cm: undefined,
      ncm: '',
      cfop: '',
      cest: '',
      origin: undefined,
      bom_components: [],
      images: [],
      min_stock: 0,
      active: true,
    },
  })

  const {
    fields: variationFields,
    append: appendVariation,
    remove: removeVariation,
  } = useFieldArray({ control, name: 'variations' })

  const {
    fields: bomFields,
    append: appendBom,
    remove: removeBom,
  } = useFieldArray({ control, name: 'bom_components' })

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({ control, name: 'images' })

  const productType = watch('product_type')
  const hasVariations = watch('has_variations')
  const isProdutoFinal = productType === 'produto_final'

  // Fetch insumos for BOM select
  useEffect(() => {
    if (isProdutoFinal) {
      fetch('/api/products?type=insumo')
        .then((res) => res.json())
        .then((json) => {
          const data = json.data ?? json
          const items = Array.isArray(data) ? data : []
          setInsumos(
            items.map((p: { id: string; name: string; sku: string | null }) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
            }))
          )
        })
        .catch(console.error)
    }
  }, [isProdutoFinal])

  // Reset variations when toggling off
  useEffect(() => {
    if (!hasVariations) {
      setValue('variations', [])
    }
  }, [hasVariations, setValue])

  // Reset BOM when not produto_final
  useEffect(() => {
    if (!isProdutoFinal) {
      setValue('bom_components', [])
      setValue('has_variations', false)
    }
  }, [isProdutoFinal, setValue])

  // Handle image file selection
  function handleImageFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        appendImage({
          data_url: reader.result as string,
          file_name: file.name,
          variation_assignment: 'geral',
        })
      }
      reader.readAsDataURL(file)
    })
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onSubmit(data: ProductFormData) {
    setSubmitting(true)
    setError(null)

    try {
      // Build the payload
      const payload: Record<string, unknown> = {
        product_type: data.product_type,
        name: data.name,
        description: data.description || undefined,
        material: data.material || undefined,
        unit: data.unit,
        sell_price: data.sell_price || 0,
        cost_price: data.cost_price || undefined,
        weight_g: data.weight_g || undefined,
        width_cm: data.width_cm || undefined,
        height_cm: data.height_cm || undefined,
        depth_cm: data.depth_cm || undefined,
        ncm: data.ncm || undefined,
        cfop: data.cfop || undefined,
        cest: data.cest || undefined,
        origin: data.origin,
        min_stock: data.min_stock,
        active: data.active,
        images: data.images.filter((img) => img.variation_assignment === 'geral').map((img) => img.data_url),
      }

      if (data.has_variations && data.variations.length > 0) {
        payload.variations = data.variations.map((v) => ({
          name: v.name,
          sku: v.sku || undefined,
          additional_cost: v.additional_cost,
          additional_price: v.additional_price,
          active: v.active,
          images: data.images
            .filter((img) => img.variation_assignment === v.name)
            .map((img) => img.data_url),
        }))
      } else {
        payload.sku = data.sku
      }

      if (data.bom_components.length > 0) {
        payload.bom_components = data.bom_components.map((bc) => ({
          component_id: bc.component_id,
          quantity: bc.quantity,
        }))
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push('/produtos')
      } else {
        const json = await res.json()
        setError(json.error || 'Erro ao salvar produto.')
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
        title="Novo Produto"
        actions={
          <Link href="/produtos">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ================================================================
            Section 1: Tipo de Produto
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product_type">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <select
                  id="product_type"
                  {...register('product_type')}
                  className={selectClassName}
                >
                  <option value="produto_final">Produto Final</option>
                  <option value="insumo">Insumo</option>
                  <option value="ativo_imobilizado">Ativo Imobilizado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 2: Informacoes Basicas
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Informacoes Basicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Variations toggle — only for produto_final */}
            {isProdutoFinal && (
              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="has_variations"
                  render={({ field }) => (
                    <Switch
                      id="has_variations"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="has_variations" className="cursor-pointer">
                  Possui variacoes (ex: cores, tamanhos)
                </Label>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* SKU — only when NO variations */}
              {!hasVariations && (
                <div className="space-y-2">
                  <Label htmlFor="sku">
                    SKU / Codigo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sku"
                    placeholder="Ex: PFWP001"
                    {...register('sku')}
                    aria-invalid={!!errors.sku}
                  />
                  {errors.sku && (
                    <p className="text-xs text-red-500">{errors.sku.message}</p>
                  )}
                </div>
              )}

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome do Produto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Nome do produto"
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Material */}
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  placeholder="Ex: Aluminio Anodizado"
                  {...register('material')}
                />
              </div>

              {/* Unidade */}
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <Input
                  id="unit"
                  placeholder="un"
                  {...register('unit')}
                />
              </div>
            </div>

            {/* Descricao */}
            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                placeholder="Descricao detalhada do produto..."
                rows={3}
                {...register('description')}
              />
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 3: Variacoes (only when toggle is on)
        ================================================================ */}
        {hasVariations && (
          <Card>
            <CardHeader>
              <CardTitle>Variacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.variations && !Array.isArray(errors.variations) && (
                <p className="text-xs text-red-500">
                  {(errors.variations as { message?: string }).message}
                </p>
              )}

              {variationFields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative grid gap-3 rounded-md border p-4 md:grid-cols-5"
                >
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeVariation(index)}
                    className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Remover variacao"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Nome */}
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Nome <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: Prata"
                      {...register(`variations.${index}.name`)}
                      aria-invalid={!!errors.variations?.[index]?.name}
                    />
                    {errors.variations?.[index]?.name && (
                      <p className="text-xs text-red-500">
                        {errors.variations[index].name?.message}
                      </p>
                    )}
                  </div>

                  {/* SKU */}
                  <div className="space-y-1">
                    <Label className="text-xs">SKU</Label>
                    <Input
                      placeholder="Ex: PFWP001-PRT"
                      {...register(`variations.${index}.sku`)}
                    />
                  </div>

                  {/* Custo Adicional */}
                  <div className="space-y-1">
                    <Label className="text-xs">Custo Adic. (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...register(`variations.${index}.additional_cost`)}
                    />
                  </div>

                  {/* Preco Adicional */}
                  <div className="space-y-1">
                    <Label className="text-xs">Preco Adic. (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...register(`variations.${index}.additional_price`)}
                    />
                  </div>

                  {/* Ativo */}
                  <div className="flex items-end gap-2 pb-1">
                    <Controller
                      control={control}
                      name={`variations.${index}.active`}
                      render={({ field: switchField }) => (
                        <Switch
                          checked={switchField.value}
                          onCheckedChange={switchField.onChange}
                        />
                      )}
                    />
                    <Label className="text-xs">Ativo</Label>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendVariation({
                    name: '',
                    sku: '',
                    additional_cost: 0,
                    additional_price: 0,
                    active: true,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Variacao
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            Section 4: Precos
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Precos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Preco de Venda */}
              <div className="space-y-2">
                <Label htmlFor="sell_price">
                  Preco de Venda (R$)
                  {isProdutoFinal && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="sell_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register('sell_price')}
                  aria-invalid={!!errors.sell_price}
                />
                {errors.sell_price && (
                  <p className="text-xs text-red-500">{errors.sell_price.message}</p>
                )}
              </div>

              {/* Preco de Custo */}
              <div className="space-y-2">
                <Label htmlFor="cost_price">Preco de Custo (R$)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register('cost_price')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 5: Dimensoes e Peso
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Dimensoes e Peso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="weight_g">Peso (g)</Label>
                <Input
                  id="weight_g"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register('weight_g')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="width_cm">Largura (cm)</Label>
                <Input
                  id="width_cm"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  {...register('width_cm')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height_cm">Altura (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  {...register('height_cm')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depth_cm">Profundidade (cm)</Label>
                <Input
                  id="depth_cm"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  {...register('depth_cm')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 6: Dados Fiscais
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Fiscais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="ncm">NCM</Label>
                <Input
                  id="ncm"
                  placeholder="00000000"
                  {...register('ncm')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfop">CFOP</Label>
                <Input
                  id="cfop"
                  placeholder="5102"
                  {...register('cfop')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cest">CEST</Label>
                <Input
                  id="cest"
                  placeholder="0000000"
                  {...register('cest')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin">Origem</Label>
                <select
                  id="origin"
                  {...register('origin')}
                  className={selectClassName}
                >
                  <option value="">Selecione...</option>
                  <option value="0">0 - Nacional</option>
                  <option value="1">1 - Estrangeira (importacao direta)</option>
                  <option value="2">2 - Estrangeira (mercado interno)</option>
                  <option value="3">3 - Nacional (40% a 70% importado)</option>
                  <option value="4">4 - Nacional (processo basico)</option>
                  <option value="5">5 - Nacional (ate 40% importado)</option>
                  <option value="6">6 - Estrangeira (importacao direta, sem similar)</option>
                  <option value="7">7 - Estrangeira (mercado interno, sem similar)</option>
                  <option value="8">8 - Nacional (acima 70% importado)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 7: Composicao (BOM) — only for produto_final
        ================================================================ */}
        {isProdutoFinal && (
          <Card>
            <CardHeader>
              <CardTitle>Composicao (Lista de Materiais)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Defina quais insumos sao necessarios para produzir uma unidade deste produto.
              </p>

              {bomFields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative grid gap-3 rounded-md border p-4 md:grid-cols-3"
                >
                  <button
                    type="button"
                    onClick={() => removeBom(index)}
                    className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Remover componente"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Insumo select */}
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">
                      Insumo <span className="text-red-500">*</span>
                    </Label>
                    <select
                      {...register(`bom_components.${index}.component_id`)}
                      className={selectClassName}
                      aria-invalid={!!errors.bom_components?.[index]?.component_id}
                    >
                      <option value="">Selecione um insumo...</option>
                      {insumos.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.sku ? `[${ins.sku}] ` : ''}
                          {ins.name}
                        </option>
                      ))}
                    </select>
                    {errors.bom_components?.[index]?.component_id && (
                      <p className="text-xs text-red-500">
                        {errors.bom_components[index].component_id?.message}
                      </p>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Qtd por unidade <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="1"
                      {...register(`bom_components.${index}.quantity`)}
                      aria-invalid={!!errors.bom_components?.[index]?.quantity}
                    />
                    {errors.bom_components?.[index]?.quantity && (
                      <p className="text-xs text-red-500">
                        {errors.bom_components[index].quantity?.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {insumos.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum insumo cadastrado. Cadastre insumos primeiro para criar composicoes.
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendBom({
                      component_id: '',
                      quantity: 1,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Componente
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================================
            Section 8: Imagens
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Imagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Adicionar Imagens
              </Button>
            </div>

            {/* Thumbnails grid */}
            {imageFields.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {imageFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative rounded-md border p-2"
                  >
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/80"
                      title="Remover imagem"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {/* Thumbnail */}
                    <img
                      src={watch(`images.${index}.data_url`)}
                      alt={watch(`images.${index}.file_name`)}
                      className="mb-2 h-32 w-full rounded object-cover"
                    />

                    {/* File name */}
                    <p className="mb-1 truncate text-xs text-muted-foreground">
                      {watch(`images.${index}.file_name`)}
                    </p>

                    {/* Variation assignment — only when has variations */}
                    {hasVariations && variationFields.length > 0 && (
                      <select
                        {...register(`images.${index}.variation_assignment`)}
                        className={`${selectClassName} text-xs`}
                      >
                        <option value="geral">Geral</option>
                        {variationFields.map((v, vIdx) => (
                          <option key={v.id} value={watch(`variations.${vIdx}.name`) || `var-${vIdx}`}>
                            {watch(`variations.${vIdx}.name`) || `Variacao ${vIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================================================================
            Section 9: Estoque e Status
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Estoque e Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Estoque Minimo */}
              <div className="space-y-2">
                <Label htmlFor="min_stock">Estoque Minimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register('min_stock')}
                />
              </div>

              {/* Ativo */}
              <div className="flex items-center gap-3 pt-7">
                <Controller
                  control={control}
                  name="active"
                  render={({ field }) => (
                    <Switch
                      id="active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Produto ativo
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Botoes
        ================================================================ */}
        <div className="flex justify-end gap-3">
          <Link href="/produtos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar Produto'}
          </Button>
        </div>
      </form>
    </div>
  )
}
