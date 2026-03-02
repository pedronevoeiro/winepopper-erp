'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Plus,
  X,
  Upload,
  FileText,
  FileWarning,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Loader2,
  UserPlus,
  Search,
} from 'lucide-react'
import type { ErpContact, ErpProductVariation } from '@/types/database'
import { formatBRL } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types for fetched data
// ---------------------------------------------------------------------------
interface SupplierOption {
  id: string
  name: string
  document: string
}

interface ProductOption {
  id: string
  name: string
  sku: string | null
  ncm: string | null
  variations: ErpProductVariation[]
}

interface WarehouseOption {
  id: string
  name: string
  code: string
}

// ---------------------------------------------------------------------------
// NFe parsed data
// ---------------------------------------------------------------------------
interface ParsedNFeItem {
  description: string
  ncm: string
  quantity: number
  unit_price: number
  total: number
}

interface ParsedNFe {
  supplier: {
    name: string
    document: string
  }
  invoice: {
    number: string
    series: string
    key: string
    issue_date: string
  }
  items: ParsedNFeItem[]
}

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------
const entryItemSchema = z.object({
  nf_description: z.string().default(''),
  nf_ncm: z.string().default(''),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
  unit_cost: z.coerce.number().min(0, 'Valor deve ser zero ou positivo'),
  product_id: z.string().min(1, 'Selecione um produto'),
  variation_id: z.string().optional(),
  active: z.boolean().default(true),
  matched: z.boolean().default(false),
})

const entrySchema = z.object({
  invoice_number: z.string().optional(),
  invoice_series: z.string().optional(),
  invoice_key: z.string().optional(),
  issue_date: z.string().optional(),
  supplier_id: z.string().min(1, 'Selecione um fornecedor'),
  warehouse_id: z.string().min(1, 'Selecione um deposito'),
  items: z.array(entryItemSchema).min(1, 'Adicione pelo menos um item'),
  total_shipping: z.coerce.number().min(0).default(0),
  total_other: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

type EntryFormData = z.infer<typeof entrySchema>

// ---------------------------------------------------------------------------
// Select styling (matches project pattern)
// ---------------------------------------------------------------------------
const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none'

// ---------------------------------------------------------------------------
// Extract CNPJ from chave de acesso (positions 6-19, 0-indexed)
// ---------------------------------------------------------------------------
function extractCnpjFromKey(key: string): string | null {
  const digits = key.replace(/\D/g, '')
  if (digits.length !== 44) return null
  return digits.substring(6, 20)
}

// ---------------------------------------------------------------------------
// XML Parsing
// ---------------------------------------------------------------------------
function parseNFeXml(xmlString: string): ParsedNFe | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')
  const nfe = doc.querySelector('NFe, nfeProc')
  if (!nfe) return null

  const emit = nfe.querySelector('emit')
  const ide = nfe.querySelector('ide')
  const dets = nfe.querySelectorAll('det')

  return {
    supplier: {
      name: emit?.querySelector('xNome')?.textContent ?? '',
      document: emit?.querySelector('CNPJ')?.textContent ?? emit?.querySelector('CPF')?.textContent ?? '',
    },
    invoice: {
      number: ide?.querySelector('nNF')?.textContent ?? '',
      series: ide?.querySelector('serie')?.textContent ?? '',
      key: nfe.querySelector('protNFe chNFe')?.textContent ?? '',
      issue_date: ide?.querySelector('dhEmi')?.textContent ?? '',
    },
    items: Array.from(dets).map((det) => {
      const prod = det.querySelector('prod')
      return {
        description: prod?.querySelector('xProd')?.textContent ?? '',
        ncm: prod?.querySelector('NCM')?.textContent ?? '',
        quantity: parseFloat(prod?.querySelector('qCom')?.textContent ?? '0'),
        unit_price: parseFloat(prod?.querySelector('vUnCom')?.textContent ?? '0'),
        total: parseFloat(prod?.querySelector('vProd')?.textContent ?? '0'),
      }
    }),
  }
}

// ---------------------------------------------------------------------------
// Match product by NCM or name similarity
// ---------------------------------------------------------------------------
function findProductMatch(
  nfItem: ParsedNFeItem,
  products: ProductOption[]
): ProductOption | null {
  // First try exact NCM match
  if (nfItem.ncm) {
    const ncmMatch = products.find(
      (p) => p.ncm && p.ncm.replace(/\D/g, '') === nfItem.ncm.replace(/\D/g, '')
    )
    if (ncmMatch) return ncmMatch
  }

  // Then try name similarity (simple substring match)
  const descLower = nfItem.description.toLowerCase()
  const nameMatch = products.find((p) => {
    const nameLower = p.name.toLowerCase()
    return (
      nameLower.includes(descLower) ||
      descLower.includes(nameLower) ||
      // Check individual words (at least 2 words matching)
      (() => {
        const descWords = descLower.split(/\s+/).filter((w) => w.length > 3)
        const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 3)
        const matchCount = descWords.filter((dw) =>
          nameWords.some((nw) => nw.includes(dw) || dw.includes(nw))
        ).length
        return matchCount >= 2
      })()
    )
  })

  return nameMatch || null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NovaEntradaPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetched data
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])

  // Upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsed' | 'pdf' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  // Supplier lookup state
  const [supplierLookupLoading, setSupplierLookupLoading] = useState(false)
  const [newSupplierOpen, setNewSupplierOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierDocument, setNewSupplierDocument] = useState('')
  const [newSupplierEmail, setNewSupplierEmail] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')
  const [newSupplierCity, setNewSupplierCity] = useState('')
  const [newSupplierState, setNewSupplierState] = useState('')
  const [newSupplierSaving, setNewSupplierSaving] = useState(false)

  // Product match confirmation state
  const [matchConfirmOpen, setMatchConfirmOpen] = useState(false)
  const [matchConfirmIndex, setMatchConfirmIndex] = useState<number | null>(null)
  const [matchConfirmProduct, setMatchConfirmProduct] = useState<ProductOption | null>(null)
  const [matchConfirmNfDesc, setMatchConfirmNfDesc] = useState('')
  const [pendingMatches, setPendingMatches] = useState<
    { index: number; product: ProductOption; nfDesc: string }[]
  >([])

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema) as unknown as Resolver<EntryFormData>,
    defaultValues: {
      invoice_number: '',
      invoice_series: '',
      invoice_key: '',
      issue_date: '',
      supplier_id: '',
      warehouse_id: '',
      items: [],
      total_shipping: 0,
      total_other: 0,
      notes: '',
    },
  })

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
    replace: replaceItems,
  } = useFieldArray({ control, name: 'items' })

  const watchedItems = watch('items')
  const totalShipping = watch('total_shipping') ?? 0
  const totalOther = watch('total_other') ?? 0
  const watchedInvoiceKey = watch('invoice_key')

  // Calculate totals
  const totalProducts = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
    0
  )
  const totalGeral = totalProducts + (Number(totalShipping) || 0) + (Number(totalOther) || 0)

  // ---------------------------------------------------------------------------
  // Fetch reference data
  // ---------------------------------------------------------------------------
  const fetchSuppliers = useCallback(() => {
    fetch('/api/contacts?type=supplier')
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json
        const items = Array.isArray(data) ? data : []
        setSuppliers(
          items.map((c: ErpContact) => ({
            id: c.id,
            name: c.trade_name || c.name,
            document: c.document,
          }))
        )
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetchSuppliers()

    // Fetch products
    fetch('/api/products')
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json
        const items = Array.isArray(data) ? data : []
        setProducts(
          items.map((p: ProductOption & Record<string, unknown>) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            ncm: p.ncm,
            variations: p.variations ?? [],
          }))
        )
      })
      .catch(console.error)

    setWarehouses([
      {
        id: '00000000-0000-0000-0005-000000000001',
        name: 'Deposito Campinas',
        code: 'CPS01',
      },
    ])
  }, [fetchSuppliers])

  // Set default warehouse once loaded
  useEffect(() => {
    if (warehouses.length === 1) {
      setValue('warehouse_id', warehouses[0].id)
    }
  }, [warehouses, setValue])

  // ---------------------------------------------------------------------------
  // Supplier lookup from chave de acesso
  // ---------------------------------------------------------------------------
  async function lookupSupplierFromKey(key: string, parsedSupplierName?: string) {
    const cnpj = extractCnpjFromKey(key)
    if (!cnpj) return

    setSupplierLookupLoading(true)
    try {
      // Search in existing suppliers by document
      const matchedSupplier = suppliers.find(
        (s) => s.document.replace(/\D/g, '') === cnpj
      )

      if (matchedSupplier) {
        setValue('supplier_id', matchedSupplier.id)
      } else {
        // Not found — open popup to create new supplier
        setNewSupplierDocument(cnpj)
        setNewSupplierName(parsedSupplierName || '')
        setNewSupplierEmail('')
        setNewSupplierPhone('')
        setNewSupplierCity('')
        setNewSupplierState('')
        setNewSupplierOpen(true)
      }
    } finally {
      setSupplierLookupLoading(false)
    }
  }

  // Handle chave de acesso blur — trigger supplier lookup
  function handleKeyBlur() {
    const key = watchedInvoiceKey
    if (key && key.replace(/\D/g, '').length === 44) {
      lookupSupplierFromKey(key)
    }
  }

  // ---------------------------------------------------------------------------
  // Create new supplier
  // ---------------------------------------------------------------------------
  async function handleCreateSupplier() {
    if (!newSupplierName || !newSupplierDocument) return
    setNewSupplierSaving(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'supplier',
          person_type: newSupplierDocument.length <= 11 ? 'PF' : 'PJ',
          name: newSupplierName,
          document: newSupplierDocument,
          email: newSupplierEmail || null,
          phone: newSupplierPhone || null,
          city: newSupplierCity || null,
          state: newSupplierState || null,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        const created = json.data as ErpContact
        // Add to local suppliers list and select it
        const newOpt: SupplierOption = {
          id: created.id,
          name: created.trade_name || created.name,
          document: created.document,
        }
        setSuppliers((prev) => [...prev, newOpt])
        setValue('supplier_id', created.id)
        setNewSupplierOpen(false)
      } else {
        const json = await res.json()
        alert(json.error || 'Erro ao criar fornecedor.')
      }
    } catch {
      alert('Erro de conexao ao criar fornecedor.')
    } finally {
      setNewSupplierSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Product match confirmation flow
  // ---------------------------------------------------------------------------
  function processNextMatch() {
    if (pendingMatches.length === 0) {
      setMatchConfirmOpen(false)
      return
    }

    const next = pendingMatches[0]
    setMatchConfirmIndex(next.index)
    setMatchConfirmProduct(next.product)
    setMatchConfirmNfDesc(next.nfDesc)
    setPendingMatches((prev) => prev.slice(1))
    setMatchConfirmOpen(true)
  }

  function confirmMatch() {
    if (matchConfirmIndex !== null && matchConfirmProduct) {
      setValue(`items.${matchConfirmIndex}.product_id`, matchConfirmProduct.id)
      setValue(`items.${matchConfirmIndex}.matched`, true)
    }
    processNextMatch()
  }

  function rejectMatch() {
    if (matchConfirmIndex !== null) {
      setValue(`items.${matchConfirmIndex}.product_id`, '')
      setValue(`items.${matchConfirmIndex}.matched`, false)
    }
    processNextMatch()
  }

  // ---------------------------------------------------------------------------
  // File upload handler
  // ---------------------------------------------------------------------------
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploadedFileName(file.name)

      if (file.name.endsWith('.pdf')) {
        setUploadStatus('pdf')
        setUploadMessage(
          'Arquivo PDF carregado. O preenchimento automatico nao e suportado para PDFs — preencha o formulario manualmente.'
        )
        return
      }

      if (file.name.endsWith('.xml')) {
        const reader = new FileReader()
        reader.onload = () => {
          const xmlString = reader.result as string
          const parsed = parseNFeXml(xmlString)

          if (!parsed) {
            setUploadStatus('error')
            setUploadMessage('Nao foi possivel interpretar o XML. Verifique se e uma NFe valida.')
            return
          }

          setUploadStatus('parsed')
          setUploadMessage(
            `XML interpretado com sucesso: ${parsed.items.length} item(s) encontrado(s).`
          )

          // Auto-fill invoice data
          setValue('invoice_number', parsed.invoice.number)
          setValue('invoice_series', parsed.invoice.series)
          setValue('invoice_key', parsed.invoice.key)

          // Format issue_date for input[type=date]
          if (parsed.invoice.issue_date) {
            const dateStr = parsed.invoice.issue_date.substring(0, 10) // YYYY-MM-DD
            setValue('issue_date', dateStr)
          }

          // Lookup supplier from chave de acesso or parsed document
          const key = parsed.invoice.key || ''
          const cnpjFromKey = extractCnpjFromKey(key)
          const supplierDoc = cnpjFromKey || parsed.supplier.document.replace(/\D/g, '')

          if (supplierDoc) {
            const matchedSupplier = suppliers.find(
              (s) => s.document.replace(/\D/g, '') === supplierDoc
            )
            if (matchedSupplier) {
              setValue('supplier_id', matchedSupplier.id)
            } else {
              // Open new supplier dialog
              setNewSupplierDocument(supplierDoc)
              setNewSupplierName(parsed.supplier.name)
              setNewSupplierEmail('')
              setNewSupplierPhone('')
              setNewSupplierCity('')
              setNewSupplierState('')
              setNewSupplierOpen(true)
            }
          }

          // Build items with product matching — queue confirmations
          const newItems = parsed.items.map((nfItem) => {
            const matchedProduct = findProductMatch(nfItem, products)
            return {
              nf_description: nfItem.description,
              nf_ncm: nfItem.ncm,
              quantity: nfItem.quantity,
              unit_cost: nfItem.unit_price,
              product_id: matchedProduct?.id ?? '',
              variation_id: '',
              active: true,
              matched: !!matchedProduct,
            }
          })

          replaceItems(newItems)

          // Queue product match confirmations for matched items
          const matchesToConfirm = parsed.items
            .map((nfItem, idx) => {
              const matchedProduct = findProductMatch(nfItem, products)
              if (matchedProduct) {
                return { index: idx, product: matchedProduct, nfDesc: nfItem.description }
              }
              return null
            })
            .filter((m): m is NonNullable<typeof m> => m !== null)

          if (matchesToConfirm.length > 0) {
            // Start confirmation flow after a short delay (let supplier dialog resolve first)
            setTimeout(() => {
              setPendingMatches(matchesToConfirm.slice(1))
              const first = matchesToConfirm[0]
              setMatchConfirmIndex(first.index)
              setMatchConfirmProduct(first.product)
              setMatchConfirmNfDesc(first.nfDesc)
              setMatchConfirmOpen(true)
            }, newSupplierOpen ? 0 : 500)
          }
        }
        reader.readAsText(file)
        return
      }

      setUploadStatus('error')
      setUploadMessage('Formato nao suportado. Envie um arquivo .xml ou .pdf.')
    },
    [suppliers, products, setValue, replaceItems, newSupplierOpen]
  )

  // Reset file input
  function clearUpload() {
    setUploadedFileName(null)
    setUploadStatus('idle')
    setUploadMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function onSubmit(data: EntryFormData) {
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        supplier_id: data.supplier_id,
        warehouse_id: data.warehouse_id,
        invoice_number: data.invoice_number || undefined,
        invoice_series: data.invoice_series || undefined,
        invoice_key: data.invoice_key || undefined,
        total_shipping: Number(data.total_shipping) || 0,
        total_other: Number(data.total_other) || 0,
        notes: data.notes || undefined,
        items: data.items
          .filter((item) => item.active)
          .map((item) => ({
            product_id: item.product_id,
            variation_id: item.variation_id || null,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
          })),
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push('/entradas')
      } else {
        const json = await res.json()
        setError(json.error || 'Erro ao salvar entrada.')
      }
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Get variations for a product
  // ---------------------------------------------------------------------------
  function getVariationsForProduct(productId: string): ErpProductVariation[] {
    const product = products.find((p) => p.id === productId)
    return product?.variations ?? []
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Entrada"
        actions={
          <Link href="/entradas">
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
            Upload de NF (XML ou PDF)
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Nota Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie o XML da NFe para preencher automaticamente os dados da nota, ou preencha manualmente abaixo.
            </p>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar Arquivo
              </Button>

              {uploadedFileName && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{uploadedFileName}</span>
                  <button
                    type="button"
                    onClick={clearUpload}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Remover arquivo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Upload status message */}
            {uploadMessage && (
              <div
                className={`flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${
                  uploadStatus === 'parsed'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : uploadStatus === 'pdf'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {uploadStatus === 'parsed' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : uploadStatus === 'pdf' ? (
                  <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                {uploadMessage}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Formatos aceitos: .xml (NFe) ou .pdf. O XML permite preenchimento automatico.
            </p>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 1: Dados da NF
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Nota Fiscal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Numero da NF */}
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Numero da NF</Label>
                <Input
                  id="invoice_number"
                  placeholder="Ex: 001234"
                  {...register('invoice_number')}
                />
              </div>

              {/* Serie */}
              <div className="space-y-2">
                <Label htmlFor="invoice_series">Serie</Label>
                <Input
                  id="invoice_series"
                  placeholder="Ex: 1"
                  {...register('invoice_series')}
                />
              </div>

              {/* Data de Emissao */}
              <div className="space-y-2">
                <Label htmlFor="issue_date">Data de Emissao</Label>
                <Input
                  id="issue_date"
                  type="date"
                  {...register('issue_date')}
                />
              </div>
            </div>

            {/* Chave de Acesso */}
            <div className="space-y-2">
              <Label htmlFor="invoice_key">Chave de Acesso (44 digitos)</Label>
              <div className="flex gap-2">
                <Input
                  id="invoice_key"
                  placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                  maxLength={44}
                  {...register('invoice_key')}
                  onBlur={handleKeyBlur}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleKeyBlur}
                  disabled={supplierLookupLoading}
                  title="Buscar fornecedor pela chave de acesso"
                >
                  {supplierLookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ao informar a chave de acesso, o fornecedor sera identificado automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 2: Fornecedor
        ================================================================ */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fornecedor</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewSupplierName('')
                  setNewSupplierDocument('')
                  setNewSupplierEmail('')
                  setNewSupplierPhone('')
                  setNewSupplierCity('')
                  setNewSupplierState('')
                  setNewSupplierOpen(true)
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="supplier_id">
                Fornecedor <span className="text-red-500">*</span>
              </Label>
              <select
                id="supplier_id"
                {...register('supplier_id')}
                className={selectClassName}
                aria-invalid={!!errors.supplier_id}
              >
                <option value="">Selecione um fornecedor...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} — {supplier.document}
                  </option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="text-xs text-red-500">{errors.supplier_id.message}</p>
              )}
              {suppliers.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum fornecedor cadastrado.{' '}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => {
                      setNewSupplierName('')
                      setNewSupplierDocument('')
                      setNewSupplierOpen(true)
                    }}
                  >
                    Cadastrar fornecedor
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 3: Deposito
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Deposito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="warehouse_id">
                Deposito <span className="text-red-500">*</span>
              </Label>
              <select
                id="warehouse_id"
                {...register('warehouse_id')}
                className={selectClassName}
                aria-invalid={!!errors.warehouse_id}
              >
                <option value="">Selecione um deposito...</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    [{wh.code}] {wh.name}
                  </option>
                ))}
              </select>
              {errors.warehouse_id && (
                <p className="text-xs text-red-500">{errors.warehouse_id.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 4: Itens
        ================================================================ */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Itens da Entrada</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {itemFields.length} item(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-xs text-red-500">
                {(errors.items as { message?: string }).message}
              </p>
            )}

            {itemFields.length === 0 && (
              <div className="rounded-md border border-dashed py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum item adicionado. Faca upload de um XML ou adicione itens manualmente.
                </p>
              </div>
            )}

            {itemFields.map((field, index) => {
              const itemProductId = watch(`items.${index}.product_id`)
              const itemVariations = getVariationsForProduct(itemProductId)
              const isMatched = watch(`items.${index}.matched`)
              const itemActive = watch(`items.${index}.active`)
              const itemQty = watch(`items.${index}.quantity`) || 0
              const itemUnitCost = watch(`items.${index}.unit_cost`) || 0
              const itemTotal = itemQty * itemUnitCost

              return (
                <div
                  key={field.id}
                  className={`relative rounded-md border p-4 ${
                    !itemActive ? 'opacity-50' : ''
                  }`}
                >
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Remover item"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Item header */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Item {index + 1}
                    </span>
                    {isMatched && (
                      <Badge
                        variant="secondary"
                        className="border-0 bg-green-100 text-green-800 text-xs"
                      >
                        <LinkIcon className="mr-1 h-3 w-3" />
                        Vinculado
                      </Badge>
                    )}
                    <span className="ml-auto text-sm font-semibold">
                      {formatBRL(itemTotal)}
                    </span>
                  </div>

                  {/* Two-column layout: NF data (left) and Stock mapping (right) */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left: dados da NF */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Dados da NF
                      </p>

                      <div className="space-y-1">
                        <Label className="text-xs">Descricao na NF</Label>
                        <Input
                          placeholder="Descricao do produto na nota"
                          {...register(`items.${index}.nf_description`)}
                        />
                      </div>

                      <div className="grid gap-3 grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">NCM</Label>
                          <Input
                            placeholder="00000000"
                            {...register(`items.${index}.nf_ncm`)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Quantidade <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0"
                            {...register(`items.${index}.quantity`)}
                            aria-invalid={!!errors.items?.[index]?.quantity}
                          />
                          {errors.items?.[index]?.quantity && (
                            <p className="text-xs text-red-500">
                              {errors.items[index].quantity?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Valor Unitario <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            {...register(`items.${index}.unit_cost`)}
                            aria-invalid={!!errors.items?.[index]?.unit_cost}
                          />
                          {errors.items?.[index]?.unit_cost && (
                            <p className="text-xs text-red-500">
                              {errors.items[index].unit_cost?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: mapeamento no estoque */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Mapeamento no Estoque
                      </p>

                      <div className="space-y-1">
                        <Label className="text-xs">
                          Produto no Estoque <span className="text-red-500">*</span>
                        </Label>
                        <select
                          {...register(`items.${index}.product_id`)}
                          className={selectClassName}
                          aria-invalid={!!errors.items?.[index]?.product_id}
                        >
                          <option value="">Selecione um produto...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku ? `[${p.sku}] ` : ''}
                              {p.name}
                              {p.ncm ? ` (NCM: ${p.ncm})` : ''}
                            </option>
                          ))}
                        </select>
                        {errors.items?.[index]?.product_id && (
                          <p className="text-xs text-red-500">
                            {errors.items[index].product_id?.message}
                          </p>
                        )}
                      </div>

                      {/* Variation select — only shown if the selected product has variations */}
                      {itemVariations.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs">Variacao</Label>
                          <select
                            {...register(`items.${index}.variation_id`)}
                            className={selectClassName}
                          >
                            <option value="">Sem variacao</option>
                            {itemVariations.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.sku ? `[${v.sku}] ` : ''}
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Active toggle */}
                      <div className="flex items-center gap-2 pt-1">
                        <Controller
                          control={control}
                          name={`items.${index}.active`}
                          render={({ field: switchField }) => (
                            <Switch
                              checked={switchField.value}
                              onCheckedChange={switchField.onChange}
                            />
                          )}
                        />
                        <Label className="text-xs cursor-pointer">
                          Incluir no lancamento
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add item button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendItem({
                  nf_description: '',
                  nf_ncm: '',
                  quantity: 1,
                  unit_cost: 0,
                  product_id: '',
                  variation_id: '',
                  active: true,
                  matched: false,
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 5: Totais
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {/* Total Produtos (read-only calculated) */}
              <div className="space-y-2">
                <Label>Total Produtos</Label>
                <div className="flex h-9 w-full items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                  {formatBRL(totalProducts)}
                </div>
              </div>

              {/* Frete */}
              <div className="space-y-2">
                <Label htmlFor="total_shipping">Frete (R$)</Label>
                <Input
                  id="total_shipping"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register('total_shipping')}
                />
              </div>

              {/* Outros */}
              <div className="space-y-2">
                <Label htmlFor="total_other">Outros (R$)</Label>
                <Input
                  id="total_other"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register('total_other')}
                />
              </div>

              {/* Total Geral (read-only calculated) */}
              <div className="space-y-2">
                <Label>Total Geral</Label>
                <div className="flex h-9 w-full items-center rounded-md border bg-muted/50 px-3 text-sm font-bold text-primary">
                  {formatBRL(totalGeral)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Section 6: Observacoes
        ================================================================ */}
        <Card>
          <CardHeader>
            <CardTitle>Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              placeholder="Observacoes sobre esta entrada..."
              rows={4}
              {...register('notes')}
            />
          </CardContent>
        </Card>

        {/* ================================================================
            Botoes
        ================================================================ */}
        <div className="flex justify-end gap-3">
          <Link href="/entradas">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar Entrada'}
          </Button>
        </div>
      </form>

      {/* ================================================================
          Dialog: Novo Fornecedor
      ================================================================ */}
      <Dialog open={newSupplierOpen} onOpenChange={setNewSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Cadastrar Fornecedor
            </DialogTitle>
            <DialogDescription>
              {newSupplierDocument
                ? `Nenhum fornecedor encontrado com o CNPJ ${newSupplierDocument}. Cadastre um novo fornecedor para continuar.`
                : 'Preencha os dados do novo fornecedor.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-supplier-name">
                Razao Social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-supplier-name"
                placeholder="Nome ou razao social"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-supplier-document">
                CNPJ/CPF <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-supplier-document"
                placeholder="00.000.000/0000-00"
                value={newSupplierDocument}
                onChange={(e) => setNewSupplierDocument(e.target.value)}
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-supplier-email">E-mail</Label>
                <Input
                  id="new-supplier-email"
                  type="email"
                  placeholder="email@empresa.com"
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-supplier-phone">Telefone</Label>
                <Input
                  id="new-supplier-phone"
                  placeholder="(00) 0000-0000"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-supplier-city">Cidade</Label>
                <Input
                  id="new-supplier-city"
                  placeholder="Cidade"
                  value={newSupplierCity}
                  onChange={(e) => setNewSupplierCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-supplier-state">UF</Label>
                <Input
                  id="new-supplier-state"
                  placeholder="SP"
                  maxLength={2}
                  value={newSupplierState}
                  onChange={(e) => setNewSupplierState(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewSupplierOpen(false)}
              disabled={newSupplierSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateSupplier}
              disabled={newSupplierSaving || !newSupplierName || !newSupplierDocument}
            >
              {newSupplierSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================
          Dialog: Confirmar vinculacao de produto
      ================================================================ */}
      <Dialog open={matchConfirmOpen} onOpenChange={setMatchConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Vinculacao de Produto</DialogTitle>
            <DialogDescription>
              O sistema encontrou um possivel cadastro para este item da NF.
              Deseja utilizar o produto ja cadastrado?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Descricao na NF
              </p>
              <p className="text-sm font-medium">{matchConfirmNfDesc}</p>
            </div>

            <div className="flex items-center justify-center">
              <div className="rounded-full bg-muted p-1">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="rounded-md border border-green-200 bg-green-50 p-3 space-y-1">
              <p className="text-xs font-medium uppercase text-green-700">
                Produto Cadastrado
              </p>
              <p className="text-sm font-medium text-green-900">
                {matchConfirmProduct?.name}
              </p>
              {matchConfirmProduct?.sku && (
                <p className="text-xs text-green-700">
                  SKU: {matchConfirmProduct.sku}
                </p>
              )}
              {matchConfirmProduct?.ncm && (
                <p className="text-xs text-green-700">
                  NCM: {matchConfirmProduct.ncm}
                </p>
              )}
            </div>

            {pendingMatches.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                +{pendingMatches.length} item(s) restante(s) para confirmar
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={rejectMatch}
            >
              Nao, selecionar manualmente
            </Button>
            <Button
              type="button"
              onClick={confirmMatch}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Sim, usar este produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
