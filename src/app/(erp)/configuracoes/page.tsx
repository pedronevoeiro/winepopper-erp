'use client'

import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDocument, formatDate, formatBRL, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { ErpCompany, ErpUserProfile, ErpUserRole, ErpProductionWorker, ErpSalesperson, ErpWarehouse } from '@/types/database'
import {
  Building2,
  CreditCard,
  Truck,
  FileText,
  Mail,
  MapPin,
  Phone,
  Users,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
  Banknote,
  Trash2,
  ClipboardList,
  HardHat,
  UserCheck,
  Warehouse,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Integrations — static data (stays the same)
// ---------------------------------------------------------------------------
interface Integration {
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  connected: boolean
  details: string
}

const integrations: Integration[] = [
  {
    name: 'Pagar.me',
    description: 'Recebimento de pagamentos via PIX, boleto e cartao',
    icon: CreditCard,
    connected: false,
    details: 'Configure sua chave de API no .env.local',
  },
  {
    name: 'Melhor Envio',
    description: 'Cotacao de frete e impressao de etiquetas',
    icon: Truck,
    connected: false,
    details: 'Configure seu token OAuth no .env.local',
  },
  {
    name: 'NF-e Provider',
    description: 'Emissao de notas fiscais eletronicas (Focus NFe / Notaas)',
    icon: FileText,
    connected: false,
    details: 'Selecione e configure o provedor de NF-e',
  },
  {
    name: 'Resend',
    description: 'Envio de e-mails transacionais e notificacoes',
    icon: Mail,
    connected: false,
    details: 'Configure a API key do Resend no .env.local',
  },
]

// ---------------------------------------------------------------------------
// Role labels and colors
// ---------------------------------------------------------------------------
const ROLE_LABELS: Record<ErpUserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  vendedor: 'Vendedor',
  financeiro: 'Financeiro',
  producao: 'Producao',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<ErpUserRole, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-purple-100 text-purple-800',
  vendedor: 'bg-blue-100 text-blue-800',
  financeiro: 'bg-green-100 text-green-800',
  producao: 'bg-orange-100 text-orange-800',
  viewer: 'bg-gray-100 text-gray-700',
}

// ---------------------------------------------------------------------------
// Company form initial state
// ---------------------------------------------------------------------------
interface CompanyFormData {
  name: string
  trade_name: string
  document: string
  state_reg: string
  municipal_reg: string
  email: string
  phone: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

const emptyCompanyForm: CompanyFormData = {
  name: '',
  trade_name: '',
  document: '',
  state_reg: '',
  municipal_reg: '',
  email: '',
  phone: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
}

// ---------------------------------------------------------------------------
// User form initial state
// ---------------------------------------------------------------------------
interface UserFormData {
  display_name: string
  email: string
  role: ErpUserRole | ''
  default_company_id: string
  active: boolean
}

const emptyUserForm: UserFormData = {
  display_name: '',
  email: '',
  role: '',
  default_company_id: '',
  active: true,
}

// ---------------------------------------------------------------------------
// Payment account types
// ---------------------------------------------------------------------------
interface PaymentAccountMethod {
  id: string
  payment_method: string
  tax_percentage: number
  tax_fixed: number
  installment_min: number
  installment_max: number
  active: boolean
}

interface PaymentAccountWithMethods {
  id: string
  name: string
  provider: string
  active: boolean
  notes: string | null
  methods: PaymentAccountMethod[]
}

interface AccountFormData {
  name: string
  provider: string
  notes: string
}

const emptyAccountForm: AccountFormData = {
  name: '',
  provider: '',
  notes: '',
}

interface MethodFormData {
  payment_method: string
  tax_percentage: string
  tax_fixed: string
  installment_min: string
  installment_max: string
}

const emptyMethodForm: MethodFormData = {
  payment_method: '',
  tax_percentage: '',
  tax_fixed: '',
  installment_min: '1',
  installment_max: '1',
}

// ---------------------------------------------------------------------------
// Worker form initial state
// ---------------------------------------------------------------------------
interface WorkerFormData {
  name: string
  role: string
  phone: string
  active: boolean
}

const emptyWorkerForm: WorkerFormData = {
  name: '',
  role: '',
  phone: '',
  active: true,
}

// ---------------------------------------------------------------------------
// Salesperson form initial state
// ---------------------------------------------------------------------------
interface SalespersonFormData {
  name: string
  email: string
  phone: string
  commission_rate: string
  active: boolean
}

const emptySalespersonForm: SalespersonFormData = {
  name: '',
  email: '',
  phone: '',
  commission_rate: '',
  active: true,
}

// ---------------------------------------------------------------------------
// Warehouse form initial state
// ---------------------------------------------------------------------------
interface WarehouseFormData {
  name: string
  code: string
  address: string
  active: boolean
}

const emptyWarehouseForm: WarehouseFormData = {
  name: '',
  code: '',
  address: '',
  active: true,
}

// ---------------------------------------------------------------------------
// Audit log entry type
// ---------------------------------------------------------------------------
interface AuditLogEntry {
  id: string
  created_at: string
  action: string
  entity_type: string
  entity_id: string | null
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function ConfiguracoesPage() {
  // Companies state
  const [companies, setCompanies] = useState<ErpCompany[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [companyForm, setCompanyForm] = useState<CompanyFormData>(emptyCompanyForm)
  const [submittingCompany, setSubmittingCompany] = useState(false)
  const [companyError, setCompanyError] = useState('')

  // Users state
  const [users, setUsers] = useState<ErpUserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [userForm, setUserForm] = useState<UserFormData>(emptyUserForm)
  const [submittingUser, setSubmittingUser] = useState(false)
  const [userError, setUserError] = useState('')

  // Payment accounts state
  const [accounts, setAccounts] = useState<PaymentAccountWithMethods[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [accountForm, setAccountForm] = useState<AccountFormData>(emptyAccountForm)
  const [submittingAccount, setSubmittingAccount] = useState(false)
  const [accountError, setAccountError] = useState('')

  // Method dialog state
  const [methodDialogOpen, setMethodDialogOpen] = useState(false)
  const [methodTargetAccountId, setMethodTargetAccountId] = useState<string | null>(null)
  const [methodForm, setMethodForm] = useState<MethodFormData>(emptyMethodForm)
  const [submittingMethod, setSubmittingMethod] = useState(false)
  const [methodError, setMethodError] = useState('')

  // Workers state
  const [workers, setWorkers] = useState<ErpProductionWorker[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(true)
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false)
  const [workerForm, setWorkerForm] = useState<WorkerFormData>(emptyWorkerForm)
  const [submittingWorker, setSubmittingWorker] = useState(false)
  const [workerError, setWorkerError] = useState('')
  const [customRoles, setCustomRoles] = useState<string[]>([])
  const [addingNewRole, setAddingNewRole] = useState(false)
  const [newRoleInput, setNewRoleInput] = useState('')

  // Salespeople state
  const [salespeople, setSalespeople] = useState<ErpSalesperson[]>([])
  const [loadingSalespeople, setLoadingSalespeople] = useState(true)
  const [salespersonDialogOpen, setSalespersonDialogOpen] = useState(false)
  const [salespersonForm, setSalespersonForm] = useState<SalespersonFormData>(emptySalespersonForm)
  const [submittingSalesperson, setSubmittingSalesperson] = useState(false)
  const [salespersonError, setSalespersonError] = useState('')

  // Warehouses state
  const [warehouseList, setWarehouseList] = useState<ErpWarehouse[]>([])
  const [loadingWarehouses, setLoadingWarehouses] = useState(true)
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false)
  const [warehouseForm, setWarehouseForm] = useState<WarehouseFormData>(emptyWarehouseForm)
  const [submittingWarehouse, setSubmittingWarehouse] = useState(false)
  const [warehouseError, setWarehouseError] = useState('')

  // User delete state
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteUserName, setDeleteUserName] = useState('')
  const [deletingUser, setDeletingUser] = useState(false)

  // User audit log state
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false)
  const [auditLogUserId, setAuditLogUserId] = useState<string | null>(null)
  const [auditLogUserName, setAuditLogUserName] = useState('')
  const [auditLogEntries, setAuditLogEntries] = useState<AuditLogEntry[]>([])
  const [loadingAuditLog, setLoadingAuditLog] = useState(false)

  // ------- Fetch companies -------
  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true)
    try {
      const res = await fetch('/api/companies')
      const json = await res.json()
      setCompanies(json.data ?? [])
    } catch {
      console.error('Erro ao carregar empresas')
    } finally {
      setLoadingCompanies(false)
    }
  }, [])

  // ------- Fetch users -------
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      setUsers(json.data ?? [])
    } catch {
      console.error('Erro ao carregar usuarios')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  // ------- Fetch payment accounts -------
  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch('/api/payment-accounts')
      const json = await res.json()
      setAccounts(json.data ?? [])
    } catch {
      console.error('Erro ao carregar contas de recebimento')
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  // ------- Fetch workers -------
  const fetchWorkers = useCallback(async () => {
    setLoadingWorkers(true)
    try {
      const res = await fetch('/api/production-workers')
      const json = await res.json()
      const data = json.data ?? []
      setWorkers(data)
      // Extract unique roles from existing workers for the dropdown
      const existingRoles = [...new Set(
        data.map((w: ErpProductionWorker) => w.role).filter(Boolean)
      )] as string[]
      const defaultRoles = ['Operador', 'Supervisor', 'Auxiliar']
      const extraRoles = existingRoles.filter((r) => !defaultRoles.includes(r))
      setCustomRoles(extraRoles)
    } catch {
      console.error('Erro ao carregar funcionarios')
    } finally {
      setLoadingWorkers(false)
    }
  }, [])

  // ------- Fetch salespeople -------
  const fetchSalespeople = useCallback(async () => {
    setLoadingSalespeople(true)
    try {
      const res = await fetch('/api/salespeople')
      const json = await res.json()
      setSalespeople(json.data ?? [])
    } catch {
      console.error('Erro ao carregar vendedores')
    } finally {
      setLoadingSalespeople(false)
    }
  }, [])

  // ------- Fetch warehouses -------
  const fetchWarehouses = useCallback(async () => {
    setLoadingWarehouses(true)
    try {
      const res = await fetch('/api/warehouses')
      const json = await res.json()
      setWarehouseList(json.data ?? [])
    } catch {
      console.error('Erro ao carregar depositos')
    } finally {
      setLoadingWarehouses(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
    fetchUsers()
    fetchAccounts()
    fetchWorkers()
    fetchSalespeople()
    fetchWarehouses()
  }, [fetchCompanies, fetchUsers, fetchAccounts, fetchWorkers, fetchSalespeople, fetchWarehouses])

  // ------- Company form handlers -------
  function handleCompanyFieldChange(field: keyof CompanyFormData, value: string) {
    setCompanyForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault()
    setCompanyError('')

    if (!companyForm.name.trim() || !companyForm.document.trim()) {
      setCompanyError('Razao Social e CNPJ sao obrigatorios.')
      return
    }

    setSubmittingCompany(true)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyForm.name.trim(),
          trade_name: companyForm.trade_name.trim() || undefined,
          document: companyForm.document.trim(),
          state_reg: companyForm.state_reg.trim() || undefined,
          municipal_reg: companyForm.municipal_reg.trim() || undefined,
          email: companyForm.email.trim() || undefined,
          phone: companyForm.phone.trim() || undefined,
          cep: companyForm.cep.trim() || undefined,
          street: companyForm.street.trim() || undefined,
          number: companyForm.number.trim() || undefined,
          complement: companyForm.complement.trim() || undefined,
          neighborhood: companyForm.neighborhood.trim() || undefined,
          city: companyForm.city.trim() || undefined,
          state: companyForm.state.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setCompanyError(json.error ?? 'Erro ao criar empresa.')
        return
      }

      setCompanyDialogOpen(false)
      setCompanyForm(emptyCompanyForm)
      await fetchCompanies()
    } catch {
      setCompanyError('Erro de rede ao criar empresa.')
    } finally {
      setSubmittingCompany(false)
    }
  }

  // ------- User form handlers -------
  function handleUserFieldChange<K extends keyof UserFormData>(
    field: K,
    value: UserFormData[K]
  ) {
    setUserForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleUserSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUserError('')

    if (!userForm.display_name.trim() || !userForm.email.trim() || !userForm.role) {
      setUserError('Nome, E-mail e Papel sao obrigatorios.')
      return
    }

    setSubmittingUser(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: userForm.display_name.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
          default_company_id: userForm.default_company_id || undefined,
          active: userForm.active,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setUserError(json.error ?? 'Erro ao criar usuario.')
        return
      }

      setUserDialogOpen(false)
      setUserForm(emptyUserForm)
      await fetchUsers()
    } catch {
      setUserError('Erro de rede ao criar usuario.')
    } finally {
      setSubmittingUser(false)
    }
  }

  // ------- Account form handlers -------
  function handleAccountFieldChange(field: keyof AccountFormData, value: string) {
    setAccountForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAccountError('')

    if (!accountForm.name.trim() || !accountForm.provider.trim()) {
      setAccountError('Nome e Provedor sao obrigatorios.')
      return
    }

    setSubmittingAccount(true)
    try {
      const res = await fetch('/api/payment-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountForm.name.trim(),
          provider: accountForm.provider.trim(),
          notes: accountForm.notes.trim() || undefined,
          methods: [],
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setAccountError(json.error ?? 'Erro ao criar conta.')
        return
      }

      setAccountDialogOpen(false)
      setAccountForm(emptyAccountForm)
      await fetchAccounts()
    } catch {
      setAccountError('Erro de rede ao criar conta.')
    } finally {
      setSubmittingAccount(false)
    }
  }

  // ------- Method form handlers -------
  function handleMethodFieldChange(field: keyof MethodFormData, value: string) {
    setMethodForm((prev) => ({ ...prev, [field]: value }))
  }

  function openMethodDialog(accountId: string) {
    setMethodTargetAccountId(accountId)
    setMethodForm(emptyMethodForm)
    setMethodError('')
    setMethodDialogOpen(true)
  }

  // Get the payment methods available for the target account.
  // credit_card can have multiple tiers (different installment ranges), so always show it.
  function getAvailableMethods(accountId: string | null): string[] {
    if (!accountId) return Object.keys(PAYMENT_METHOD_LABELS)
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return Object.keys(PAYMENT_METHOD_LABELS)
    const usedMethods = new Set(account.methods.map((m) => m.payment_method))
    return Object.keys(PAYMENT_METHOD_LABELS).filter(
      (m) => m === 'credit_card' || !usedMethods.has(m)
    )
  }

  async function handleMethodSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMethodError('')

    if (!methodForm.payment_method || !methodTargetAccountId) {
      setMethodError('Selecione uma forma de pagamento.')
      return
    }

    const taxPercentage = parseFloat(methodForm.tax_percentage) || 0
    const taxFixed = parseFloat(methodForm.tax_fixed) || 0
    const instMin = parseInt(methodForm.installment_min) || 1
    const instMax = parseInt(methodForm.installment_max) || 1

    setSubmittingMethod(true)
    try {
      const res = await fetch('/api/payment-accounts/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: methodTargetAccountId,
          payment_method: methodForm.payment_method,
          tax_percentage: taxPercentage,
          tax_fixed: taxFixed,
          installment_min: instMin,
          installment_max: instMax,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setMethodError(json.error ?? 'Erro ao adicionar metodo.')
        return
      }

      setMethodDialogOpen(false)
      setMethodForm(emptyMethodForm)
      setMethodTargetAccountId(null)
      await fetchAccounts()
    } catch {
      setMethodError('Erro de rede ao adicionar metodo.')
    } finally {
      setSubmittingMethod(false)
    }
  }

  // ------- Toggle account active status -------
  async function handleToggleAccount(accountId: string, currentActive: boolean) {
    try {
      const res = await fetch('/api/payment-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId, active: !currentActive }),
      })
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === accountId ? { ...a, active: !currentActive } : a
          )
        )
      }
    } catch {
      console.error('Erro ao alterar status da conta')
    }
  }

  // ------- Worker form handlers -------
  function handleWorkerFieldChange<K extends keyof WorkerFormData>(
    field: K,
    value: WorkerFormData[K]
  ) {
    setWorkerForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleWorkerSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWorkerError('')

    if (!workerForm.name.trim()) {
      setWorkerError('Nome e obrigatorio.')
      return
    }

    setSubmittingWorker(true)
    try {
      const res = await fetch('/api/production-workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workerForm.name.trim(),
          role: workerForm.role || undefined,
          phone: workerForm.phone.trim() || undefined,
          active: workerForm.active,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setWorkerError(json.error ?? 'Erro ao criar funcionario.')
        return
      }

      setWorkerDialogOpen(false)
      setWorkerForm(emptyWorkerForm)
      await fetchWorkers()
    } catch {
      setWorkerError('Erro de rede ao criar funcionario.')
    } finally {
      setSubmittingWorker(false)
    }
  }

  // ------- Salesperson form handlers -------
  function handleSalespersonFieldChange<K extends keyof SalespersonFormData>(
    field: K,
    value: SalespersonFormData[K]
  ) {
    setSalespersonForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSalespersonSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalespersonError('')

    if (!salespersonForm.name.trim() || !salespersonForm.commission_rate) {
      setSalespersonError('Nome e Comissao sao obrigatorios.')
      return
    }

    setSubmittingSalesperson(true)
    try {
      const res = await fetch('/api/salespeople', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: salespersonForm.name.trim(),
          email: salespersonForm.email.trim() || undefined,
          phone: salespersonForm.phone.trim() || undefined,
          commission_rate: parseFloat(salespersonForm.commission_rate) || 0,
          active: salespersonForm.active,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setSalespersonError(json.error ?? 'Erro ao criar vendedor.')
        return
      }

      setSalespersonDialogOpen(false)
      setSalespersonForm(emptySalespersonForm)
      await fetchSalespeople()
    } catch {
      setSalespersonError('Erro de rede ao criar vendedor.')
    } finally {
      setSubmittingSalesperson(false)
    }
  }

  // ------- Warehouse form handlers -------
  function handleWarehouseFieldChange<K extends keyof WarehouseFormData>(
    field: K,
    value: WarehouseFormData[K]
  ) {
    setWarehouseForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleWarehouseSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWarehouseError('')

    if (!warehouseForm.name.trim() || !warehouseForm.code.trim()) {
      setWarehouseError('Nome e Codigo sao obrigatorios.')
      return
    }

    setSubmittingWarehouse(true)
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: warehouseForm.name.trim(),
          code: warehouseForm.code.trim(),
          address: warehouseForm.address.trim() || undefined,
          active: warehouseForm.active,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setWarehouseError(json.error ?? 'Erro ao criar deposito.')
        return
      }

      setWarehouseDialogOpen(false)
      setWarehouseForm(emptyWarehouseForm)
      await fetchWarehouses()
    } catch {
      setWarehouseError('Erro de rede ao criar deposito.')
    } finally {
      setSubmittingWarehouse(false)
    }
  }

  // ------- User delete handler -------
  function openDeleteUserDialog(userId: string, userName: string) {
    setDeleteUserId(userId)
    setDeleteUserName(userName)
    setDeleteUserDialogOpen(true)
  }

  async function handleDeleteUser() {
    if (!deleteUserId) return
    setDeletingUser(true)
    try {
      const res = await fetch(`/api/users/${deleteUserId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDeleteUserDialogOpen(false)
        setDeleteUserId(null)
        setDeleteUserName('')
        await fetchUsers()
      }
    } catch {
      console.error('Erro ao excluir usuario')
    } finally {
      setDeletingUser(false)
    }
  }

  // ------- User audit log handler -------
  async function openAuditLogDialog(userId: string, userName: string) {
    setAuditLogUserId(userId)
    setAuditLogUserName(userName)
    setAuditLogEntries([])
    setLoadingAuditLog(true)
    setAuditLogDialogOpen(true)
    try {
      const res = await fetch(`/api/audit-log?user_id=${userId}`)
      const json = await res.json()
      setAuditLogEntries(json.data ?? [])
    } catch {
      console.error('Erro ao carregar log de atividades')
    } finally {
      setLoadingAuditLog(false)
    }
  }

  // ------- Helper: find company name by id -------
  function companyName(id: string | null): string {
    if (!id) return '—'
    const c = companies.find((co) => co.id === id)
    return c ? (c.trade_name ?? c.name) : '—'
  }

  // ------- Render -------
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracoes"
        description="Configuracoes do sistema e integracoes"
      />

      <Tabs defaultValue="empresa">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList>
            <TabsTrigger value="empresa">Empresa</TabsTrigger>
            <TabsTrigger value="integracoes">Integracoes</TabsTrigger>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="contas">Contas de Recebimento</TabsTrigger>
            <TabsTrigger value="funcionarios">Funcionarios</TabsTrigger>
            <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
            <TabsTrigger value="depositos">Depositos</TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================= */}
        {/* Companies Tab                                                  */}
        {/* ============================================================= */}
        <TabsContent value="empresa" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={() => { setCompanyForm(emptyCompanyForm); setCompanyError(''); setCompanyDialogOpen(true) }}>
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </div>

          {loadingCompanies ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {companies.map((company) => (
                <Card key={company.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {company.trade_name ?? company.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {company.name}
                        </CardDescription>
                      </div>
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">CNPJ</p>
                        <p className="font-mono font-medium">
                          {formatDocument(company.document)}
                        </p>
                      </div>
                      {company.state_reg && (
                        <div>
                          <p className="text-xs text-muted-foreground">Inscricao Estadual</p>
                          <p className="font-mono font-medium">{company.state_reg}</p>
                        </div>
                      )}
                      {company.municipal_reg && (
                        <div>
                          <p className="text-xs text-muted-foreground">Inscricao Municipal</p>
                          <p className="font-mono font-medium">{company.municipal_reg}</p>
                        </div>
                      )}
                    </div>

                    {(company.street || company.phone || company.email) && (
                      <div className="border-t pt-3 space-y-2 text-sm">
                        {company.street && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {company.street}
                              {company.number ? `, ${company.number}` : ''}
                              {company.complement ? ` - ${company.complement}` : ''}
                              {company.neighborhood ? ` - ${company.neighborhood}` : ''}
                              {company.city ? `, ${company.city}` : ''}
                              {company.state ? `/${company.state}` : ''}
                              {company.cep ? ` - CEP ${company.cep}` : ''}
                            </span>
                          </div>
                        )}
                        {company.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{company.phone}</span>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span>{company.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================================================= */}
        {/* Integrations Tab (unchanged)                                   */}
        {/* ============================================================= */}
        <TabsContent value="integracoes" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = integration.icon
              return (
                <Card key={integration.name}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="mt-0.5 text-xs">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      {integration.connected ? (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-green-100 text-green-800 font-medium"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Conectado
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-gray-100 text-gray-600 font-medium"
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Desconectado
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{integration.details}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ============================================================= */}
        {/* Users Tab                                                      */}
        {/* ============================================================= */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {users.length} usuario{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={() => { setUserForm(emptyUserForm); setUserError(''); setUserDialogOpen(true) }}>
              <Plus className="h-4 w-4" />
              Novo Usuario
            </Button>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Empresa Padrao</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Cadastro</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.display_name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`border-0 font-medium ${ROLE_COLORS[user.role]}`}
                          >
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {companyName(user.default_company_id)}
                        </TableCell>
                        <TableCell>
                          {user.active ? (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-green-100 text-green-800 font-medium"
                            >
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-gray-100 text-gray-600 font-medium"
                            >
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openAuditLogDialog(user.id, user.display_name)}
                              title="Ver Log"
                            >
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => openDeleteUserDialog(user.id, user.display_name)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum usuario cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================= */}
        {/* Workers Tab                                                    */}
        {/* ============================================================= */}
        <TabsContent value="funcionarios" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {workers.length} funcionario{workers.length !== 1 ? 's' : ''} cadastrado{workers.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={() => { setWorkerForm(emptyWorkerForm); setWorkerError(''); setWorkerDialogOpen(true) }}>
              <Plus className="h-4 w-4" />
              Novo Funcionario
            </Button>
          </div>

          {loadingWorkers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell className="font-medium">{worker.name}</TableCell>
                        <TableCell className="text-muted-foreground">{worker.role ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{worker.phone ?? '—'}</TableCell>
                        <TableCell>
                          {worker.active ? (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-green-100 text-green-800 font-medium"
                            >
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-gray-100 text-gray-600 font-medium"
                            >
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <HardHat className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {workers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum funcionario cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================= */}
        {/* Salespeople Tab                                                */}
        {/* ============================================================= */}
        <TabsContent value="vendedores" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {salespeople.length} vendedor{salespeople.length !== 1 ? 'es' : ''} cadastrado{salespeople.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={() => { setSalespersonForm(emptySalespersonForm); setSalespersonError(''); setSalespersonDialogOpen(true) }}>
              <Plus className="h-4 w-4" />
              Novo Vendedor
            </Button>
          </div>

          {loadingSalespeople ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Comissao (%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salespeople.map((sp) => (
                      <TableRow key={sp.id}>
                        <TableCell className="font-medium">{sp.name}</TableCell>
                        <TableCell className="text-muted-foreground">{sp.email ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{sp.phone ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {sp.commission_rate.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          {sp.active ? (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-green-100 text-green-800 font-medium"
                            >
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-gray-100 text-gray-600 font-medium"
                            >
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {salespeople.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum vendedor cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================= */}
        {/* Warehouses (Depositos) Tab                                     */}
        {/* ============================================================= */}
        <TabsContent value="depositos" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {warehouseList.length} deposito{warehouseList.length !== 1 ? 's' : ''} cadastrado{warehouseList.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={() => { setWarehouseForm(emptyWarehouseForm); setWarehouseError(''); setWarehouseDialogOpen(true) }}>
              <Plus className="h-4 w-4" />
              Novo Deposito
            </Button>
          </div>

          {loadingWarehouses ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Endereco</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseList.map((wh) => (
                      <TableRow key={wh.id}>
                        <TableCell className="font-medium">{wh.name}</TableCell>
                        <TableCell className="text-muted-foreground">{wh.code}</TableCell>
                        <TableCell className="text-muted-foreground">{wh.address ?? '—'}</TableCell>
                        <TableCell>
                          {wh.active ? (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-green-100 text-green-800 font-medium"
                            >
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-gray-100 text-gray-600 font-medium"
                            >
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {warehouseList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhum deposito cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================= */}
        {/* Payment Accounts Tab                                           */}
        {/* ============================================================= */}
        <TabsContent value="contas" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {accounts.length} conta{accounts.length !== 1 ? 's' : ''} cadastrada{accounts.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={() => { setAccountForm(emptyAccountForm); setAccountError(''); setAccountDialogOpen(true) }}>
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </div>

          {loadingAccounts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Banknote className="mx-auto h-10 w-10 mb-3 opacity-50" />
                  <p>Nenhuma conta de recebimento cadastrada.</p>
                  <p className="text-xs mt-1">
                    Clique em &quot;Nova Conta&quot; para adicionar uma conta de pagamento.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Banknote className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{account.name}</CardTitle>
                          <CardDescription className="mt-0.5 text-xs">
                            {account.provider}
                            {account.notes ? ` — ${account.notes}` : ''}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleToggleAccount(account.id, account.active)}
                        >
                          {account.active ? (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-green-100 text-green-800 font-medium cursor-pointer"
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="border-0 bg-gray-100 text-gray-600 font-medium cursor-pointer"
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Inativo
                            </Badge>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {account.methods.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Forma de Pagamento</TableHead>
                            <TableHead>Parcelas</TableHead>
                            <TableHead className="text-right">Taxa %</TableHead>
                            <TableHead className="text-right">Taxa Fixa</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {account.methods.map((method) => {
                            const label = PAYMENT_METHOD_LABELS[method.payment_method] ?? method.payment_method
                            const isInstallment = method.payment_method === 'credit_card' && (method.installment_min > 1 || method.installment_max > 1)
                            const rangeLabel =
                              method.installment_min === method.installment_max
                                ? `${method.installment_min}x`
                                : `${method.installment_min}-${method.installment_max}x`

                            return (
                              <TableRow key={method.id}>
                                <TableCell className="font-medium">
                                  {label}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                  {method.payment_method === 'credit_card'
                                    ? rangeLabel
                                    : '—'}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {method.tax_percentage.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatBRL(method.tax_fixed)}
                                </TableCell>
                                <TableCell>
                                  {method.active ? (
                                    <Badge
                                      variant="secondary"
                                      className="border-0 bg-green-100 text-green-800 font-medium text-xs"
                                    >
                                      Ativo
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="border-0 bg-gray-100 text-gray-600 font-medium text-xs"
                                    >
                                      Inativo
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">
                        Nenhuma forma de pagamento configurada.
                      </p>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openMethodDialog(account.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Metodo
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* =============================================================== */}
      {/* Dialog: Nova Empresa                                             */}
      {/* =============================================================== */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
            <DialogDescription>
              Preencha os dados da nova empresa. Campos com * sao obrigatorios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompanySubmit}>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 py-2">
                {/* Dados principais */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Dados Principais</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="company-name">Razao Social *</Label>
                      <Input
                        id="company-name"
                        value={companyForm.name}
                        onChange={(e) => handleCompanyFieldChange('name', e.target.value)}
                        placeholder="Razao social da empresa"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-trade-name">Nome Fantasia</Label>
                      <Input
                        id="company-trade-name"
                        value={companyForm.trade_name}
                        onChange={(e) => handleCompanyFieldChange('trade_name', e.target.value)}
                        placeholder="Nome fantasia"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-document">CNPJ *</Label>
                      <Input
                        id="company-document"
                        value={companyForm.document}
                        onChange={(e) => handleCompanyFieldChange('document', e.target.value)}
                        placeholder="00.000.000/0000-00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-state-reg">Inscricao Estadual</Label>
                      <Input
                        id="company-state-reg"
                        value={companyForm.state_reg}
                        onChange={(e) => handleCompanyFieldChange('state_reg', e.target.value)}
                        placeholder="Inscricao estadual"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-municipal-reg">Inscricao Municipal</Label>
                      <Input
                        id="company-municipal-reg"
                        value={companyForm.municipal_reg}
                        onChange={(e) => handleCompanyFieldChange('municipal_reg', e.target.value)}
                        placeholder="Inscricao municipal"
                      />
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Contato</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-email">E-mail</Label>
                      <Input
                        id="company-email"
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => handleCompanyFieldChange('email', e.target.value)}
                        placeholder="contato@empresa.com.br"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">Telefone</Label>
                      <Input
                        id="company-phone"
                        value={companyForm.phone}
                        onChange={(e) => handleCompanyFieldChange('phone', e.target.value)}
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereco */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Endereco</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-cep">CEP</Label>
                      <Input
                        id="company-cep"
                        value={companyForm.cep}
                        onChange={(e) => handleCompanyFieldChange('cep', e.target.value)}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="company-street">Rua</Label>
                      <Input
                        id="company-street"
                        value={companyForm.street}
                        onChange={(e) => handleCompanyFieldChange('street', e.target.value)}
                        placeholder="Nome da rua"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-number">Numero</Label>
                      <Input
                        id="company-number"
                        value={companyForm.number}
                        onChange={(e) => handleCompanyFieldChange('number', e.target.value)}
                        placeholder="000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-complement">Complemento</Label>
                      <Input
                        id="company-complement"
                        value={companyForm.complement}
                        onChange={(e) => handleCompanyFieldChange('complement', e.target.value)}
                        placeholder="Sala, andar, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-neighborhood">Bairro</Label>
                      <Input
                        id="company-neighborhood"
                        value={companyForm.neighborhood}
                        onChange={(e) => handleCompanyFieldChange('neighborhood', e.target.value)}
                        placeholder="Bairro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-city">Cidade</Label>
                      <Input
                        id="company-city"
                        value={companyForm.city}
                        onChange={(e) => handleCompanyFieldChange('city', e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-state">UF</Label>
                      <Input
                        id="company-state"
                        value={companyForm.state}
                        onChange={(e) => handleCompanyFieldChange('state', e.target.value)}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {companyError && (
              <p className="mt-2 text-sm text-destructive">{companyError}</p>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCompanyDialogOpen(false)}
                disabled={submittingCompany}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingCompany}>
                {submittingCompany && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Empresa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* Dialog: Novo Usuario                                             */}
      {/* =============================================================== */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Usuario</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuario. Campos com * sao obrigatorios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUserSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nome *</Label>
                <Input
                  id="user-name"
                  value={userForm.display_name}
                  onChange={(e) => handleUserFieldChange('display_name', e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-email">E-mail *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => handleUserFieldChange('email', e.target.value)}
                  placeholder="usuario@empresa.com.br"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-role">Papel *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(v) => handleUserFieldChange('role', v as ErpUserRole)}
                >
                  <SelectTrigger id="user-role" className="w-full">
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="producao">Producao</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-company">Empresa Padrao</Label>
                <Select
                  value={userForm.default_company_id}
                  onValueChange={(v) => handleUserFieldChange('default_company_id', v)}
                >
                  <SelectTrigger id="user-company" className="w-full">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.trade_name ?? c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="user-active"
                  checked={userForm.active}
                  onChange={(e) =>
                    handleUserFieldChange('active', (e.target as HTMLInputElement).checked)
                  }
                />
                <Label htmlFor="user-active" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>

            {userError && (
              <p className="mt-2 text-sm text-destructive">{userError}</p>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserDialogOpen(false)}
                disabled={submittingUser}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingUser}>
                {submittingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* Dialog: Nova Conta de Recebimento                                */}
      {/* =============================================================== */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Conta de Recebimento</DialogTitle>
            <DialogDescription>
              Preencha os dados da nova conta. Campos com * sao obrigatorios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAccountSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="account-name">Nome *</Label>
                <Input
                  id="account-name"
                  value={accountForm.name}
                  onChange={(e) => handleAccountFieldChange('name', e.target.value)}
                  placeholder="Ex: Pagar.me Principal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-provider">Provedor *</Label>
                <Input
                  id="account-provider"
                  value={accountForm.provider}
                  onChange={(e) => handleAccountFieldChange('provider', e.target.value)}
                  placeholder="Ex: pagarme, pagseguro, rede, inter, bradesco"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-notes">Observacoes</Label>
                <Textarea
                  id="account-notes"
                  value={accountForm.notes}
                  onChange={(e) => handleAccountFieldChange('notes', e.target.value)}
                  placeholder="Informacoes adicionais sobre esta conta"
                  rows={3}
                />
              </div>
            </div>

            {accountError && (
              <p className="mt-2 text-sm text-destructive">{accountError}</p>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAccountDialogOpen(false)}
                disabled={submittingAccount}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingAccount}>
                {submittingAccount && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Conta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* Dialog: Adicionar Metodo de Pagamento                            */}
      {/* =============================================================== */}
      <Dialog open={methodDialogOpen} onOpenChange={setMethodDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Metodo de Pagamento</DialogTitle>
            <DialogDescription>
              Selecione a forma de pagamento e configure as taxas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMethodSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="method-type">Forma de Pagamento *</Label>
                <Select
                  value={methodForm.payment_method}
                  onValueChange={(v) => handleMethodFieldChange('payment_method', v)}
                >
                  <SelectTrigger id="method-type" className="w-full">
                    <SelectValue placeholder="Selecione uma forma" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMethods(methodTargetAccountId).map((key) => (
                      <SelectItem key={key} value={key}>
                        {PAYMENT_METHOD_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Installment range — only for credit_card */}
              {methodForm.payment_method === 'credit_card' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="method-inst-min">Parcela Min</Label>
                    <Input
                      id="method-inst-min"
                      type="number"
                      min="1"
                      max="12"
                      value={methodForm.installment_min}
                      onChange={(e) => handleMethodFieldChange('installment_min', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method-inst-max">Parcela Max</Label>
                    <Input
                      id="method-inst-max"
                      type="number"
                      min="1"
                      max="12"
                      value={methodForm.installment_max}
                      onChange={(e) => handleMethodFieldChange('installment_max', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="method-tax-pct">Taxa %</Label>
                  <Input
                    id="method-tax-pct"
                    type="number"
                    step="0.01"
                    min="0"
                    value={methodForm.tax_percentage}
                    onChange={(e) => handleMethodFieldChange('tax_percentage', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method-tax-fixed">Taxa Fixa R$</Label>
                  <Input
                    id="method-tax-fixed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={methodForm.tax_fixed}
                    onChange={(e) => handleMethodFieldChange('tax_fixed', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {methodError && (
              <p className="mt-2 text-sm text-destructive">{methodError}</p>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMethodDialogOpen(false)}
                disabled={submittingMethod}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingMethod}>
                {submittingMethod && <Loader2 className="h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* Dialog: Novo Funcionario                                         */}
      {/* =============================================================== */}
      <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Funcionario</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo funcionario de producao. Campos com * sao obrigatorios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWorkerSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="worker-name">Nome *</Label>
                <Input
                  id="worker-name"
                  value={workerForm.name}
                  onChange={(e) => handleWorkerFieldChange('name', e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="worker-role">Cargo</Label>
                {addingNewRole ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newRoleInput}
                      onChange={(e) => setNewRoleInput(e.target.value)}
                      placeholder="Digite o novo cargo..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newRoleInput.trim()) {
                            const newRole = newRoleInput.trim()
                            if (!customRoles.includes(newRole)) {
                              setCustomRoles((prev) => [...prev, newRole])
                            }
                            handleWorkerFieldChange('role', newRole)
                            setNewRoleInput('')
                            setAddingNewRole(false)
                          }
                        } else if (e.key === 'Escape') {
                          setAddingNewRole(false)
                          setNewRoleInput('')
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newRoleInput.trim()) {
                          const newRole = newRoleInput.trim()
                          if (!customRoles.includes(newRole)) {
                            setCustomRoles((prev) => [...prev, newRole])
                          }
                          handleWorkerFieldChange('role', newRole)
                          setNewRoleInput('')
                          setAddingNewRole(false)
                        }
                      }}
                    >
                      OK
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => { setAddingNewRole(false); setNewRoleInput('') }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={workerForm.role}
                      onValueChange={(v) => handleWorkerFieldChange('role', v)}
                    >
                      <SelectTrigger id="worker-role" className="flex-1">
                        <SelectValue placeholder="Selecione um cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Operador">Operador</SelectItem>
                        <SelectItem value="Supervisor">Supervisor</SelectItem>
                        <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                        {customRoles.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setAddingNewRole(true)}
                      title="Adicionar novo cargo"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="worker-phone">Telefone</Label>
                <Input
                  id="worker-phone"
                  value={workerForm.phone}
                  onChange={(e) => handleWorkerFieldChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="worker-active"
                  checked={workerForm.active}
                  onChange={(e) =>
                    handleWorkerFieldChange('active', (e.target as HTMLInputElement).checked)
                  }
                />
                <Label htmlFor="worker-active" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>

            {workerError && (
              <p className="mt-2 text-sm text-destructive">{workerError}</p>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWorkerDialogOpen(false)}
                disabled={submittingWorker}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingWorker}>
                {submittingWorker && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Funcionario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* Dialog: Novo Vendedor                                            */}
      {/* =============================================================== */}
      <Dialog open={salespersonDialogOpen} onOpenChange={setSalespersonDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Vendedor</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo vendedor. Campos com * sao obrigatorios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalespersonSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="sp-name">Nome *</Label>
                <Input
                  id="sp-name"
                  value={salespersonForm.name}
                  onChange={(e) => handleSalespersonFieldChange('name', e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-email">E-mail</Label>
                <Input
                  id="sp-email"
                  type="email"
                  value={salespersonForm.email}
                  onChange={(e) => handleSalespersonFieldChange('email', e.target.value)}
                  placeholder="vendedor@empresa.com.br"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-phone">Telefone</Label>
                <Input
                  id="sp-phone"
                  value={salespersonForm.phone}
                  onChange={(e) => handleSalespersonFieldChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sp-commission">Comissao % *</Label>
                <Input
                  id="sp-commission"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={salespersonForm.commission_rate}
                  onChange={(e) => handleSalespersonFieldChange('commission_rate', e.target.value)}
                  placeholder="10.00"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="sp-active"
                  checked={salespersonForm.active}
                  onChange={(e) =>
                    handleSalespersonFieldChange('active', (e.target as HTMLInputElement).checked)
                  }
                />
                <Label htmlFor="sp-active" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>

            {salespersonError && (
              <p className="mt-2 text-sm text-destructive">{salespersonError}</p>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSalespersonDialogOpen(false)}
                disabled={submittingSalesperson}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingSalesperson}>
                {submittingSalesperson && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Vendedor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* Dialog: Confirmar Exclusao de Usuario                            */}
      {/* =============================================================== */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Usuario</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este usuario?
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground py-2">
            O usuario <span className="font-medium text-foreground">{deleteUserName}</span> sera removido permanentemente.
          </p>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteUserDialogOpen(false)}
              disabled={deletingUser}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deletingUser}
            >
              {deletingUser && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* Dialog: Log de Atividades do Usuario                             */}
      {/* =============================================================== */}
      <Dialog open={auditLogDialogOpen} onOpenChange={setAuditLogDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log de Atividades</DialogTitle>
            <DialogDescription>
              Atividades recentes de {auditLogUserName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {loadingAuditLog ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : auditLogEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma atividade registrada.
              </p>
            ) : (
              <div className="space-y-3 py-2">
                {auditLogEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm border-b pb-3 last:border-0">
                    <div className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                      {formatDate(entry.created_at)}
                    </div>
                    <div>
                      <p className="font-medium">{entry.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.entity_type}
                        {entry.entity_id ? ` #${entry.entity_id.slice(0, 8)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAuditLogDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =============================================================== */}
      {/* Dialog: Novo Deposito                                            */}
      {/* =============================================================== */}
      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Deposito</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo deposito. Campos com * sao obrigatorios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWarehouseSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="wh-name">Nome *</Label>
                <Input
                  id="wh-name"
                  value={warehouseForm.name}
                  onChange={(e) => handleWarehouseFieldChange('name', e.target.value)}
                  placeholder="Deposito Principal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wh-code">Codigo *</Label>
                <Input
                  id="wh-code"
                  value={warehouseForm.code}
                  onChange={(e) => handleWarehouseFieldChange('code', e.target.value)}
                  placeholder="CPS01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wh-address">Endereco</Label>
                <Input
                  id="wh-address"
                  value={warehouseForm.address}
                  onChange={(e) => handleWarehouseFieldChange('address', e.target.value)}
                  placeholder="Rua, numero - Cidade/UF"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="wh-active"
                  checked={warehouseForm.active}
                  onChange={(e) =>
                    handleWarehouseFieldChange('active', (e.target as HTMLInputElement).checked)
                  }
                />
                <Label htmlFor="wh-active" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>

            {warehouseError && (
              <p className="mt-2 text-sm text-destructive">{warehouseError}</p>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWarehouseDialogOpen(false)}
                disabled={submittingWarehouse}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingWarehouse}>
                {submittingWarehouse && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Deposito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
