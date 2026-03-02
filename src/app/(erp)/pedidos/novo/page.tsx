'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { formatBRL, formatDocument } from '@/lib/constants'
import { cn } from '@/lib/utils'
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
  Trash2,
  Loader2,
  Paperclip,
  FileText,
  Image,
  Archive,
  X,
  Search,
  Check,
  Truck,
  Clipboard,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types for reference data
// ---------------------------------------------------------------------------
interface CompanyOption {
  id: string
  name: string
  trade_name: string | null
  document: string
  email: string | null
  phone: string | null
  cep: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  state_reg: string | null
}

interface ContactOption {
  id: string
  name: string
  trade_name: string | null
  document: string
  cep: string | null
}

interface SalespersonOption {
  id: string
  name: string
}

interface ProductOption {
  id: string
  name: string
  sku: string
  sell_price: number
  stock_available: number
}

interface PaymentAccountOption {
  id: string
  name: string
  provider: string
  active: boolean
  methods: {
    payment_method: string
    tax_percentage: number
    tax_fixed: number
    installment_min: number
    installment_max: number
    active: boolean
  }[]
}

interface ShippingQuoteOption {
  carrier: string
  method: string
  price: number
  days: number
  logo: string | null
}

// ---------------------------------------------------------------------------
// Form value types + Zod schema
// ---------------------------------------------------------------------------
interface OrderItemValues {
  product_id: string
  quantity: number
  unit_price: number
  discount: number
}

interface ShippingAddress {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

interface InstallmentRow {
  num: number
  days: number
  due_date: string
  amount: number
}

interface OrderFormValues {
  company_id: string
  contact_id: string
  salesperson_id: string
  payment_method: string
  payment_account_id: string
  payment_condition: string
  notes: string
  shipping_cost: number
  shipping_method: string
  use_different_address: boolean
  shipping_address: ShippingAddress
  items: OrderItemValues[]
}

const orderItemSchema = z.object({
  product_id: z.string().min(1, 'Selecione um produto'),
  quantity: z.number().min(1, 'Min. 1'),
  unit_price: z.number().min(0, 'Preco invalido'),
  discount: z.number().min(0).default(0),
})

const orderFormSchema = z.object({
  company_id: z.string().min(1, 'Selecione a empresa'),
  contact_id: z.string().min(1, 'Selecione o cliente'),
  salesperson_id: z.string().optional(),
  payment_method: z.string().optional(),
  payment_account_id: z.string().optional(),
  payment_condition: z.string().optional(),
  notes: z.string().optional(),
  shipping_cost: z.number().min(0).default(0),
  shipping_method: z.string().optional(),
  use_different_address: z.boolean().default(false),
  shipping_address: z.object({
    cep: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
  items: z.array(orderItemSchema).min(1, 'Adicione pelo menos 1 item'),
})

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------
const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'credit_card', label: 'Cartao de Credito' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Outro' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format file size to human-readable */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Get icon for file type */
function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return FileText
  if (['png', 'jpg', 'jpeg', 'svg'].includes(ext ?? '')) return Image
  if (ext === 'zip') return Archive
  return Paperclip
}

/** Format tax info for display next to account name */
function formatTaxInfo(methods: PaymentAccountOption['methods'], paymentMethod: string): string {
  const method = methods.find((m) => m.payment_method === paymentMethod && m.active)
  if (!method) return ''
  if (method.tax_percentage > 0) return `(${method.tax_percentage}%)`
  if (method.tax_fixed > 0) return `(${formatBRL(method.tax_fixed)})`
  return '(sem taxa)'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NovoPedidoPage() {
  const router = useRouter()

  // Reference data
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountOption[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Attachments (outside react-hook-form)
  const [attachments, setAttachments] = useState<File[]>([])

  // Installments state
  const [installments, setInstallments] = useState<InstallmentRow[]>([])
  const [showCompanyInfo, setShowCompanyInfo] = useState(false)

  // Shipping quote state
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuoteOption[]>([])
  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState<number | null>(null)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [quotesError, setQuotesError] = useState<string | null>(null)

  // Form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema) as unknown as Resolver<OrderFormValues>,
    defaultValues: {
      company_id: '',
      contact_id: '',
      salesperson_id: '',
      payment_method: '',
      payment_account_id: '',
      payment_condition: '',
      notes: '',
      shipping_cost: 0,
      shipping_method: '',
      use_different_address: false,
      shipping_address: {
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      },
      items: [
        { product_id: '', quantity: 1, unit_price: 0, discount: 0 },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchedItems = form.watch('items')
  const watchedShipping = form.watch('shipping_cost')
  const watchedPaymentMethod = form.watch('payment_method')
  const watchedContactId = form.watch('contact_id')
  const watchedCompanyId = form.watch('company_id')
  const watchedUseDifferentAddress = form.watch('use_different_address')
  const watchedShippingAddressCep = form.watch('shipping_address.cep')

  // Derive the selected company for info display
  const selectedCompany = companies.find((c) => c.id === watchedCompanyId)

  // Derive the CEP for freight lookup
  const selectedContact = contacts.find((c) => c.id === watchedContactId)
  const freightCep = watchedUseDifferentAddress
    ? (watchedShippingAddressCep ?? '')
    : (selectedContact?.cep ?? '')

  // Filter payment accounts by selected payment method
  const filteredAccounts = paymentAccounts.filter(
    (account) =>
      account.active &&
      account.methods.some(
        (m) => m.payment_method === watchedPaymentMethod && m.active
      )
  )

  // Fetch reference data on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/companies').then((r) => r.json()),
      fetch('/api/contacts?type=customer').then((r) => r.json()),
      fetch('/api/salespeople').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/payment-accounts').then((r) => r.json()),
    ])
      .then(([co, ct, sp, pr, pa]) => {
        setCompanies(co.data ?? [])
        setContacts(ct.data ?? [])
        setSalespeople(sp.data ?? [])
        setProducts(pr.data ?? [])
        setPaymentAccounts(pa.data ?? [])
      })
      .catch(console.error)
      .finally(() => setLoadingData(false))
  }, [])

  // Clear payment_account_id when payment_method changes
  useEffect(() => {
    form.setValue('payment_account_id', '')
  }, [watchedPaymentMethod, form])

  // Clear shipping quotes when contact or address changes
  useEffect(() => {
    setShippingQuotes([])
    setSelectedQuoteIndex(null)
    setQuotesError(null)
  }, [freightCep])

  // Clear shipping address fields when unchecking "use different address"
  useEffect(() => {
    if (!watchedUseDifferentAddress) {
      form.setValue('shipping_address', {
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      })
    }
  }, [watchedUseDifferentAddress, form])

  // Computed totals
  const itemSubtotals = (watchedItems ?? []).map((item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    const disc = Number(item.discount) || 0
    return qty * price - disc
  })

  const subtotalItens = itemSubtotals.reduce((sum, v) => sum + v, 0)
  const descontoTotal = (watchedItems ?? []).reduce(
    (sum, item) => sum + (Number(item.discount) || 0),
    0
  )
  const shippingCost = Number(watchedShipping) || 0
  const totalPedido = subtotalItens + shippingCost

  // Auto-fill unit_price when product changes
  function handleProductChange(index: number, productId: string) {
    form.setValue(`items.${index}.product_id`, productId)
    const product = products.find((p) => p.id === productId)
    if (product) {
      form.setValue(`items.${index}.unit_price`, product.sell_price)
    }
  }

  // Attachments handlers
  const ACCEPTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'svg', 'zip']
  const ACCEPTED_MIME_PREFIXES = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf', 'application/zip', 'application/x-zip']

  function isAcceptedFile(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext && ACCEPTED_EXTENSIONS.includes(ext)) return true
    return ACCEPTED_MIME_PREFIXES.some((m) => file.type.startsWith(m))
  }

  function addFiles(files: File[]) {
    const accepted = files.filter(isAcceptedFile)
    if (accepted.length > 0) {
      setAttachments((prev) => [...prev, ...accepted])
    }
  }

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = '' // reset input
  }

  function handleFileRemove(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items)
    const files: File[] = []
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      addFiles(files)
    }
  }

  const [isDragging, setIsDragging] = useState(false)

  // New contact dialog state
  const [showNewContactDialog, setShowNewContactDialog] = useState(false)
  const [newContactSubmitting, setNewContactSubmitting] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    trade_name: '',
    document: '',
    person_type: 'PJ' as 'PJ' | 'PF',
    email: '',
    phone: '',
    cep: '',
    city: '',
    state: '',
  })

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  // New contact creation
  async function handleCreateContact() {
    if (!newContact.name || !newContact.document) return
    setNewContactSubmitting(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newContact,
          type: 'customer',
          trade_name: newContact.trade_name || null,
          email: newContact.email || null,
          phone: newContact.phone || null,
          cep: newContact.cep || null,
          city: newContact.city || null,
          state: newContact.state || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Erro ao criar contato.')
        return
      }
      const json = await res.json()
      const created = json.data
      // Add to local list and select it
      setContacts((prev) => [...prev, {
        id: created.id,
        name: created.name,
        trade_name: created.trade_name,
        document: created.document,
        cep: created.cep,
      }])
      form.setValue('contact_id', created.id)
      setShowNewContactDialog(false)
      setNewContact({ name: '', trade_name: '', document: '', person_type: 'PJ', email: '', phone: '', cep: '', city: '', state: '' })
    } catch {
      alert('Erro ao criar contato.')
    } finally {
      setNewContactSubmitting(false)
    }
  }

  // Installment generation
  function generateInstallments(conditionOverride?: string) {
    const conditionStr = conditionOverride ?? form.getValues('payment_condition') ?? ''
    // Parse comma-separated days: "0, 30, 60" or "30/60/90"
    const days = conditionStr
      .split(/[,;/\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0)

    if (days.length === 0) {
      setInstallments([])
      return
    }

    const total = totalPedido
    if (total <= 0) {
      // Generate structure with zero amounts so user sees the plan
      const today = new Date()
      const rows: InstallmentRow[] = days.map((d, i) => {
        const due = new Date(today)
        due.setDate(due.getDate() + d)
        return { num: i + 1, days: d, due_date: due.toISOString().slice(0, 10), amount: 0 }
      })
      setInstallments(rows)
      return
    }

    const perInstallment = Math.floor((total / days.length) * 100) / 100
    const remainder = Math.round((total - perInstallment * days.length) * 100) / 100

    const today = new Date()
    const rows: InstallmentRow[] = days.map((d, i) => {
      const due = new Date(today)
      due.setDate(due.getDate() + d)
      const amount = i === days.length - 1 ? perInstallment + remainder : perInstallment
      return {
        num: i + 1,
        days: d,
        due_date: due.toISOString().slice(0, 10),
        amount,
      }
    })

    setInstallments(rows)
  }

  // Preset condition helpers
  const CONDITION_PRESETS = [
    { label: 'A vista', value: '0' },
    { label: '30/60', value: '30, 60' },
    { label: '30/60/90', value: '30, 60, 90' },
    { label: '0/30/60', value: '0, 30, 60' },
    { label: '0/30/60/90', value: '0, 30, 60, 90' },
  ]

  // Shipping quote lookup
  const fetchShippingQuotes = useCallback(async () => {
    const cep = freightCep.replace(/\D/g, '')
    if (!cep || cep.length < 8) {
      setQuotesError('CEP invalido. Verifique o CEP do cliente ou do endereco de entrega.')
      return
    }

    setLoadingQuotes(true)
    setQuotesError(null)
    setShippingQuotes([])
    setSelectedQuoteIndex(null)

    try {
      const res = await fetch(`/api/shipping/quote?cep=${cep}`)
      if (!res.ok) {
        const err = await res.json()
        setQuotesError(err.error ?? 'Erro ao buscar cotacao de frete.')
        return
      }
      const json = await res.json()
      setShippingQuotes(json.data ?? [])
    } catch {
      setQuotesError('Erro ao buscar cotacao de frete.')
    } finally {
      setLoadingQuotes(false)
    }
  }, [freightCep])

  // Select a shipping quote
  function handleSelectQuote(index: number) {
    setSelectedQuoteIndex(index)
    const quote = shippingQuotes[index]
    if (quote) {
      form.setValue('shipping_cost', quote.price)
      form.setValue('shipping_method', `${quote.carrier} ${quote.method}`)
    }
  }

  // Submit handler
  async function onSubmit(values: OrderFormValues, status: 'draft' | 'pending') {
    setSubmitting(true)
    try {
      const payload = {
        company_id: values.company_id,
        contact_id: values.contact_id,
        salesperson_id: values.salesperson_id || null,
        payment_method: values.payment_method || null,
        payment_account_id: values.payment_account_id || null,
        payment_condition: values.payment_condition || null,
        installments: installments.length || 1,
        installments_detail: installments.length > 0 ? installments : null,
        notes: values.notes || null,
        shipping_cost: values.shipping_cost,
        shipping_method: values.shipping_method || null,
        shipping_address: values.use_different_address
          ? values.shipping_address
          : null,
        attachments: attachments.map((f) => f.name),
        status,
        items: values.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
        })),
      }

      const res = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Erro ao criar pedido.')
        return
      }

      router.push('/pedidos')
    } catch (err) {
      console.error(err)
      alert('Erro ao criar pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loadingData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Novo Pedido"
          actions={
            <Link href="/pedidos">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          }
        />
        <Card>
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Pedido"
        description="Preencha os dados para criar um novo pedido de venda"
        actions={
          <Link href="/pedidos">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            // Default submit = "Criar Pedido" (pending)
            form.handleSubmit((values) => onSubmit(values, 'pending'))(e)
          }}
          className="space-y-6"
        >
          {/* ============================================================= */}
          {/* Section 1: Dados Gerais                                       */}
          {/* ============================================================= */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Gerais</CardTitle>
              <CardDescription>
                Informacoes basicas do pedido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Empresa — visual card selector */}
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa *</FormLabel>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {companies.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => field.onChange(c.id)}
                          className={cn(
                            'relative flex flex-col gap-1 rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
                            field.value === c.id
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-muted hover:border-muted-foreground/30'
                          )}
                        >
                          {field.value === c.id && (
                            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <span className="text-sm font-semibold">
                            {c.trade_name || c.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.name}
                          </span>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            <span>CNPJ: {formatDocument(c.document)}</span>
                            {c.state_reg && <span>IE: {c.state_reg}</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {c.street}{c.number ? `, ${c.number}` : ''} — {c.neighborhood}, {c.city}/{c.state} {c.cep}
                          </span>
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Cliente + Novo Cliente */}
                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Cliente *</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto gap-1 py-0 text-xs text-primary"
                          onClick={() => setShowNewContactDialog(true)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Novo Cliente
                        </Button>
                      </div>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.trade_name || c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vendedor */}
                <FormField
                  control={form.control}
                  name="salesperson_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendedor</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salespeople.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Observacoes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observacoes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observacoes sobre o pedido..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Company quick info */}
              {selectedCompany && (
                <div className="rounded-md border bg-muted/30">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
                    onClick={() => setShowCompanyInfo((v) => !v)}
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {selectedCompany.trade_name || selectedCompany.name}
                      <span className="font-normal text-muted-foreground">
                        — {formatDocument(selectedCompany.document)}
                      </span>
                    </span>
                    {showCompanyInfo ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {showCompanyInfo && (
                    <div className="grid gap-x-8 gap-y-1 border-t px-4 py-3 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Razao Social: </span>
                        <span>{selectedCompany.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CNPJ: </span>
                        <span>{formatDocument(selectedCompany.document)}</span>
                      </div>
                      {selectedCompany.state_reg && (
                        <div>
                          <span className="text-muted-foreground">IE: </span>
                          <span>{selectedCompany.state_reg}</span>
                        </div>
                      )}
                      {selectedCompany.email && (
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span>{selectedCompany.email}</span>
                        </div>
                      )}
                      {selectedCompany.phone && (
                        <div>
                          <span className="text-muted-foreground">Telefone: </span>
                          <span>{selectedCompany.phone}</span>
                        </div>
                      )}
                      {selectedCompany.street && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground">Endereco: </span>
                          <span>
                            {selectedCompany.street}
                            {selectedCompany.number ? `, ${selectedCompany.number}` : ''}
                            {selectedCompany.complement ? ` — ${selectedCompany.complement}` : ''}
                            {selectedCompany.neighborhood ? `, ${selectedCompany.neighborhood}` : ''}
                            {selectedCompany.city ? ` — ${selectedCompany.city}` : ''}
                            {selectedCompany.state ? `/${selectedCompany.state}` : ''}
                            {selectedCompany.cep ? ` (${selectedCompany.cep})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============================================================= */}
          {/* Section 2: Itens do Pedido                                    */}
          {/* ============================================================= */}
          <Card>
            <CardHeader>
              <CardTitle>Itens do Pedido</CardTitle>
              <CardDescription>
                Adicione os produtos e quantidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items table */}
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Produto</TableHead>
                      <TableHead className="w-[90px]">Qtd</TableHead>
                      <TableHead className="w-[130px]">Preco Unit.</TableHead>
                      <TableHead className="w-[120px]">Desconto</TableHead>
                      <TableHead className="w-[130px] text-right">
                        Subtotal
                      </TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const lineSubtotal = itemSubtotals[index] ?? 0

                      return (
                        <TableRow key={field.id}>
                          {/* Produto */}
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.product_id`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <Select
                                    onValueChange={(val) =>
                                      handleProductChange(index, val)
                                    }
                                    value={f.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {products.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.sku} - {p.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>

                          {/* Quantidade */}
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      className="text-right"
                                      {...f}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>

                          {/* Preco Unitario */}
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unit_price`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      className="text-right"
                                      {...f}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>

                          {/* Desconto */}
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discount`}
                              render={({ field: f }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      className="text-right"
                                      {...f}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>

                          {/* Subtotal (read-only) */}
                          <TableCell className="text-right font-medium">
                            {formatBRL(lineSubtotal)}
                          </TableCell>

                          {/* Remover */}
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (fields.length > 1) {
                                  remove(index)
                                }
                              }}
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Adicionar Item button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    product_id: '',
                    quantity: 1,
                    unit_price: 0,
                    discount: 0,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>

              {/* Items validation message */}
              {form.formState.errors.items?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}

              {/* Totals row */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal dos Itens</span>
                    <span className="font-medium">
                      {formatBRL(subtotalItens + descontoTotal)}
                    </span>
                  </div>
                  {descontoTotal > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Desconto Total</span>
                      <span className="font-medium">
                        - {formatBRL(descontoTotal)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-base font-semibold">
                    <span>Total dos Itens</span>
                    <span>{formatBRL(subtotalItens)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============================================================= */}
          {/* Section 3: Frete                                              */}
          {/* ============================================================= */}
          <Card>
            <CardHeader>
              <CardTitle>Frete</CardTitle>
              <CardDescription>
                Cotacao de frete e endereco de entrega
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alternate shipping address checkbox */}
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="use_different_address"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onChange={(e) =>
                            field.onChange(
                              (e.target as HTMLInputElement).checked
                            )
                          }
                        />
                      </FormControl>
                      <Label className="cursor-pointer font-normal">
                        Entregar em endereco diferente do faturamento
                      </Label>
                    </FormItem>
                  )}
                />
              </div>

              {/* Alternate shipping address fields */}
              {watchedUseDifferentAddress && (
                <div className="rounded-md border p-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Endereco de Entrega
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="shipping_address.cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="00000-000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_address.street"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Rua</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua / Avenida" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_address.number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_address.complement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apto, Sala..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_address.neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_address.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Cidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_address.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="UF" maxLength={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Freight lookup */}
              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 max-w-xs">
                    <Label className="text-sm text-muted-foreground">
                      CEP para cotacao:{' '}
                      <span className="font-medium text-foreground">
                        {freightCep || '(selecione o cliente)'}
                      </span>
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!freightCep || loadingQuotes}
                    onClick={fetchShippingQuotes}
                  >
                    {loadingQuotes ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Buscar Frete
                  </Button>
                </div>

                {/* Quotes error */}
                {quotesError && (
                  <p className="text-sm text-destructive">{quotesError}</p>
                )}

                {/* Shipping quotes list */}
                {shippingQuotes.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {shippingQuotes.map((quote, idx) => (
                      <button
                        key={`${quote.carrier}-${quote.method}`}
                        type="button"
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent',
                          selectedQuoteIndex === idx
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border'
                        )}
                        onClick={() => handleSelectQuote(idx)}
                      >
                        <div
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            selectedQuoteIndex === idx
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30'
                          )}
                        >
                          {selectedQuoteIndex === idx && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {quote.carrier} {quote.method}
                          </div>
                          <div className="text-muted-foreground">
                            {quote.days} {quote.days === 1 ? 'dia util' : 'dias uteis'}
                          </div>
                        </div>
                        <div className="text-right font-semibold">
                          {formatBRL(quote.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual freight inputs */}
                <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
                  <FormField
                    control={form.control}
                    name="shipping_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor do Frete</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0,00"
                            className="text-right"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shipping_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metodo de Envio</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Correios PAC"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============================================================= */}
          {/* Section 4: Pagamento                                         */}
          {/* ============================================================= */}
          <Card>
            <CardHeader>
              <CardTitle>Pagamento</CardTitle>
              <CardDescription>
                Forma de pagamento, conta de recebimento e parcelas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Forma de Pagamento */}
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map((pm) => (
                            <SelectItem key={pm.value} value={pm.value}>
                              {pm.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conta de Recebimento */}
                <FormField
                  control={form.control}
                  name="payment_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta de Recebimento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!watchedPaymentMethod}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                !watchedPaymentMethod
                                  ? 'Selecione a forma de pagamento primeiro'
                                  : filteredAccounts.length === 0
                                    ? 'Nenhuma conta disponivel'
                                    : 'Selecione a conta'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}{' '}
                              {formatTaxInfo(account.methods, watchedPaymentMethod)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Condicao de pagamento / parcelas */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <FormField
                    control={form.control}
                    name="payment_condition"
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-[200px] max-w-xs">
                        <FormLabel>Condicao de Pagamento (dias)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 0, 30, 60"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateInstallments()}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Gerar Parcelas
                  </Button>
                </div>

                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2">
                  {CONDITION_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-7 text-xs"
                      onClick={() => {
                        form.setValue('payment_condition', preset.value)
                        generateInstallments(preset.value)
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                {/* Installments table */}
                {installments.length > 0 && totalPedido <= 0 && (
                  <p className="text-sm text-amber-600">
                    Os valores das parcelas serao recalculados quando itens forem adicionados ao pedido.
                  </p>
                )}
                {installments.length > 0 && (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Parcela</TableHead>
                          <TableHead className="w-[80px]">Dias</TableHead>
                          <TableHead className="w-[140px]">Vencimento</TableHead>
                          <TableHead className="w-[140px] text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installments.map((inst) => (
                          <TableRow key={inst.num}>
                            <TableCell className="font-medium">
                              {inst.num}/{installments.length}
                            </TableCell>
                            <TableCell>{inst.days === 0 ? 'A vista' : `${inst.days}d`}</TableCell>
                            <TableCell>{new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatBRL(inst.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={3}>Total</TableCell>
                          <TableCell className="text-right">
                            {formatBRL(installments.reduce((s, i) => s + i.amount, 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ============================================================= */}
          {/* Section 5: Anexos                                             */}
          {/* ============================================================= */}
          <Card
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardHeader>
              <CardTitle>Anexos</CardTitle>
              <CardDescription>
                Arquivos relacionados ao pedido (propostas, artes, briefings)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop zone / paste zone */}
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                <Paperclip className="h-6 w-6" />
                <div className="text-sm">
                  <Label
                    htmlFor="file-upload"
                    className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Selecionar arquivos
                  </Label>
                  <span>, arraste aqui ou </span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Clipboard className="inline h-3.5 w-3.5" />
                    Ctrl+V
                  </span>
                  <span> para colar</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPEG, PDF, SVG, ZIP — sem limite de arquivos
                </p>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".png,.jpeg,.jpg,.pdf,.svg,.zip"
                  multiple
                  onChange={handleFileAdd}
                />
              </div>

              {/* Attached files list */}
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((file, idx) => {
                    const FileIcon = getFileIcon(file.name)
                    return (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                      >
                        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 min-w-0 truncate">
                          {file.name}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          ({formatFileSize(file.size)})
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleFileRemove(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {attachments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum arquivo anexado.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ============================================================= */}
          {/* Summary                                                       */}
          {/* ============================================================= */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal dos Itens
                  </span>
                  <span className="font-medium">{formatBRL(subtotalItens)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-medium">{formatBRL(shippingCost)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total do Pedido</span>
                  <span>{formatBRL(totalPedido)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============================================================= */}
          {/* Form Actions                                                  */}
          {/* ============================================================= */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/pedidos">
              <Button type="button" variant="outline" disabled={submitting}>
                Cancelar
              </Button>
            </Link>

            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                form.handleSubmit((values) => onSubmit(values, 'draft'))()
              }}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar como Rascunho
            </Button>

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Criar Pedido
            </Button>
          </div>
        </form>
      </Form>

      {/* ================================================================= */}
      {/* Dialog: Novo Cliente                                              */}
      {/* ================================================================= */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastro rapido de cliente. Para dados completos, acesse Contatos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Razao Social / Nome *</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Razao social ou nome completo"
                />
              </div>
              <div>
                <Label>Nome Fantasia</Label>
                <Input
                  value={newContact.trade_name}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, trade_name: e.target.value }))
                  }
                  placeholder="Nome fantasia (opcional)"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={newContact.person_type}
                  onValueChange={(v) =>
                    setNewContact((p) => ({ ...p, person_type: v as 'PJ' | 'PF' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">Pessoa Juridica</SelectItem>
                    <SelectItem value="PF">Pessoa Fisica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{newContact.person_type === 'PJ' ? 'CNPJ' : 'CPF'} *</Label>
                <Input
                  value={newContact.document}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, document: e.target.value }))
                  }
                  placeholder={newContact.person_type === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input
                  value={newContact.cep}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, cep: e.target.value }))
                  }
                  placeholder="00000-000"
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={newContact.city}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, city: e.target.value }))
                  }
                  placeholder="Cidade"
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={newContact.state}
                  onChange={(e) =>
                    setNewContact((p) => ({ ...p, state: e.target.value }))
                  }
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewContactDialog(false)}
              disabled={newContactSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateContact}
              disabled={!newContact.name || !newContact.document || newContactSubmitting}
            >
              {newContactSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
