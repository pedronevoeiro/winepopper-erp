// Tipos do banco de dados ERP — gerados manualmente a partir do schema

export type ErpContactType = 'customer' | 'supplier' | 'both'
export type ErpPersonType = 'PF' | 'PJ'
export type ErpOrderStatus = 'draft' | 'pending' | 'approved' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled' | 'returned'
export type ErpFinancialType = 'receivable' | 'payable'
export type ErpFinancialStatus = 'open' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type ErpPaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash' | 'check' | 'other'
export type ErpInvoiceStatus = 'draft' | 'processing' | 'authorized' | 'cancelled' | 'denied'
export type ErpInvoiceDirection = 'outgoing' | 'incoming'
export type ErpProductionStatus = 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type ErpCommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled'
export type ErpUserRole = 'admin' | 'manager' | 'vendedor' | 'financeiro' | 'producao' | 'viewer'
export type ErpProductType = 'produto_final' | 'insumo' | 'ativo_imobilizado'
export type ErpProductStructure = 'simples' | 'composto' | 'com_variacoes'
export type ErpPurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'

export interface ErpCompany {
  id: string
  name: string
  trade_name: string | null
  document: string
  state_reg: string | null
  municipal_reg: string | null
  email: string | null
  phone: string | null
  cep: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  ibge_code: string | null
  logo_url: string | null
  is_mirror_stock: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export interface ErpUserProfile {
  id: string
  email: string
  display_name: string
  role: ErpUserRole
  phone: string | null
  active: boolean
  default_company_id: string | null
  created_at: string
  updated_at: string
}

export interface ErpContact {
  id: string
  type: ErpContactType
  person_type: ErpPersonType
  name: string
  trade_name: string | null
  document: string
  state_reg: string | null
  municipal_reg: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  website: string | null
  cep: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  ibge_code: string | null
  notes: string | null
  active: boolean
  salesperson_id: string | null
  bling_id: number | null
  created_at: string
  updated_at: string
}

export interface ErpSalesperson {
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  commission_rate: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ErpProduct {
  id: string
  sku: string | null
  name: string
  description: string | null
  product_type: ErpProductType
  cost_price: number
  sell_price: number
  weight_grams: number
  height_cm: number
  width_cm: number
  length_cm: number
  structure: ErpProductStructure
  supplier_id: string | null
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
  store_product_id: string | null
  bling_id: number | null
  created_at: string
  updated_at: string
}

export interface ErpProductVariation {
  id: string
  product_id: string
  name: string
  sku: string | null
  additional_cost: number
  additional_price: number
  active: boolean
  images: string[]
}

export interface ErpWarehouse {
  id: string
  name: string
  code: string
  address: string | null
  active: boolean
  created_at: string
}

export interface ErpStock {
  id: string
  product_id: string
  variation_id: string | null
  warehouse_id: string
  company_id: string | null
  quantity: number
  reserved: number
  min_quantity: number
}

export interface ErpStockMovement {
  id: string
  product_id: string
  variation_id: string | null
  warehouse_id: string
  company_id: string | null
  quantity: number
  type: 'sale' | 'purchase' | 'production' | 'adjustment' | 'transfer' | 'return'
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface ErpStockWriteoff {
  id: string
  sales_order_id: string
  order_item_id: string | null
  product_id: string
  variation_id: string | null
  company_id: string
  warehouse_id: string
  quantity: number
  is_mirror: boolean
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface ErpSalesOrder {
  id: string
  order_number: number
  contact_id: string
  salesperson_id: string | null
  status: ErpOrderStatus
  order_date: string
  expected_date: string | null
  subtotal: number
  discount_value: number
  shipping_cost: number
  other_costs: number
  total: number
  payment_method: ErpPaymentMethod | null
  payment_account_id: string | null
  payment_condition: string | null
  installments: number
  shipping_address: Record<string, string> | null
  shipping_method: string | null
  shipping_tracking: string | null
  carrier_name: string | null
  company_id: string | null
  bling_id: number | null
  store_order_id: string | null
  pagarme_id: string | null
  melhorenvio_id: string | null
  sales_channel: 'b2b' | 'b2c' | null
  store_name: string | null
  notes: string | null
  attachments: string[]
  internal_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ErpSalesOrderItem {
  id: string
  order_id: string
  product_id: string
  variation_id: string | null
  description: string
  sku: string | null
  quantity: number
  unit_price: number
  discount_pct: number
  total: number
  ncm: string | null
  cfop: string | null
}

export interface ErpFinancialEntry {
  id: string
  type: ErpFinancialType
  status: ErpFinancialStatus
  contact_id: string | null
  description: string
  amount: number
  paid_amount: number
  due_date: string
  payment_date: string | null
  payment_method: ErpPaymentMethod | null
  account_id: string | null
  reference_type: string | null
  reference_id: string | null
  company_id: string | null
  category: string | null
  notes: string | null
  bling_id: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ErpFinancialInstallment {
  id: string
  entry_id: string
  installment_num: number
  amount: number
  due_date: string
  paid_amount: number
  payment_date: string | null
  status: ErpFinancialStatus
}

export interface ErpInvoice {
  id: string
  direction: ErpInvoiceDirection
  status: ErpInvoiceStatus
  number: number | null
  series: number
  access_key: string | null
  protocol: string | null
  sales_order_id: string | null
  contact_id: string | null
  company_id: string | null
  total_products: number
  total_shipping: number
  total_discount: number
  total_tax: number
  total: number
  provider: string
  provider_ref: string | null
  xml_url: string | null
  pdf_url: string | null
  bling_id: number | null
  issue_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ErpProductMirror {
  id: string
  source_company_id: string
  source_product_id: string
  source_variation_id: string | null
  target_company_id: string
  target_product_id: string
  target_variation_id: string | null
  quantity_ratio: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ErpInvoiceItem {
  id: string
  invoice_id: string
  product_id: string
  variation_id: string | null
  description: string
  sku: string | null
  quantity: number
  unit_price: number
  discount_pct: number
  total: number
  ncm: string | null
  cfop: string | null
}

export interface ErpProductionOrder {
  id: string
  order_number: number
  status: ErpProductionStatus
  product_id: string
  variation_id: string | null
  quantity: number
  quantity_produced: number
  quantity_lost: number
  warehouse_id: string
  sales_order_id: string | null
  assigned_workers: string[]
  planned_date: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ErpProductionComponent {
  id: string
  production_id: string
  component_id: string
  required_qty: number
  consumed_qty: number
}

export interface ErpBomComponent {
  id: string
  parent_id: string
  component_id: string
  quantity: number
  notes: string | null
}

export interface ErpProductionWorker {
  id: string
  name: string
  role: string | null
  phone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface ErpPurchaseEntry {
  id: string
  supplier_id: string
  company_id: string | null
  invoice_number: string | null
  invoice_series: string | null
  invoice_key: string | null
  total_products: number
  total_shipping: number
  total_other: number
  total: number
  entry_date: string
  issue_date: string | null
  status: 'pending' | 'received' | 'cancelled'
  warehouse_id: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ErpPurchaseEntryItem {
  id: string
  entry_id: string
  product_id: string
  variation_id: string | null
  quantity: number
  unit_cost: number
  total: number
}

export interface ErpPurchaseOrder {
  id: string
  order_number: number
  supplier_id: string
  status: ErpPurchaseOrderStatus
  expected_date: string | null
  total_estimated: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ErpPurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  variation_id: string | null
  quantity: number
  unit_cost_estimated: number
  quantity_received: number
  total_estimated: number
}

export interface ErpCommission {
  id: string
  salesperson_id: string
  sales_order_id: string
  order_total: number
  commission_rate: number
  commission_value: number
  status: ErpCommissionStatus
  financial_entry_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface ErpSetting {
  key: string
  value: unknown
}

export interface ErpBlingCredentials {
  id: string
  company_id: string
  client_id: string
  client_secret: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  connected: boolean
  created_at: string
  updated_at: string
}

export interface ErpPaymentAccount {
  id: string
  name: string           // e.g., "Pagar.me", "Inter", "Bradesco"
  provider: string       // slug: "pagarme", "inter", "bradesco", "rede", "pagseguro"
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ErpPaymentAccountMethod {
  id: string
  account_id: string
  payment_method: ErpPaymentMethod
  tax_percentage: number  // e.g., 2.99
  tax_fixed: number       // e.g., 3.49 (fixed amount per transaction in BRL)
  installment_min: number // e.g., 1 (for credit_card tiers: 1x, 2-6x, 7-12x)
  installment_max: number // e.g., 1 (for credit_card tiers: 1x, 2-6x, 7-12x)
  active: boolean
}

// Tipo genérico do banco — usado pelos Supabase clients
export interface Database {
  public: {
    Tables: {
      erp_user_profiles: { Row: ErpUserProfile; Insert: Partial<ErpUserProfile> & Pick<ErpUserProfile, 'id' | 'email' | 'display_name'>; Update: Partial<ErpUserProfile> }
      erp_contacts: { Row: ErpContact; Insert: Partial<ErpContact> & Pick<ErpContact, 'name' | 'document'>; Update: Partial<ErpContact> }
      erp_salespeople: { Row: ErpSalesperson; Insert: Partial<ErpSalesperson> & Pick<ErpSalesperson, 'name'>; Update: Partial<ErpSalesperson> }
      erp_products: { Row: ErpProduct; Insert: Partial<ErpProduct> & Pick<ErpProduct, 'name'>; Update: Partial<ErpProduct> }
      erp_product_variations: { Row: ErpProductVariation; Insert: Partial<ErpProductVariation> & Pick<ErpProductVariation, 'product_id' | 'name'>; Update: Partial<ErpProductVariation> }
      erp_warehouses: { Row: ErpWarehouse; Insert: Partial<ErpWarehouse> & Pick<ErpWarehouse, 'name' | 'code'>; Update: Partial<ErpWarehouse> }
      erp_stock: { Row: ErpStock; Insert: Partial<ErpStock> & Pick<ErpStock, 'product_id' | 'warehouse_id'>; Update: Partial<ErpStock> }
      erp_stock_movements: { Row: ErpStockMovement; Insert: Partial<ErpStockMovement> & Pick<ErpStockMovement, 'product_id' | 'warehouse_id' | 'quantity' | 'type'>; Update: Partial<ErpStockMovement> }
      erp_sales_orders: { Row: ErpSalesOrder; Insert: Partial<ErpSalesOrder> & Pick<ErpSalesOrder, 'contact_id'>; Update: Partial<ErpSalesOrder> }
      erp_sales_order_items: { Row: ErpSalesOrderItem; Insert: Partial<ErpSalesOrderItem> & Pick<ErpSalesOrderItem, 'order_id' | 'product_id' | 'description' | 'quantity' | 'unit_price' | 'total'>; Update: Partial<ErpSalesOrderItem> }
      erp_financial_entries: { Row: ErpFinancialEntry; Insert: Partial<ErpFinancialEntry> & Pick<ErpFinancialEntry, 'type' | 'description' | 'amount' | 'due_date'>; Update: Partial<ErpFinancialEntry> }
      erp_financial_installments: { Row: ErpFinancialInstallment; Insert: Partial<ErpFinancialInstallment> & Pick<ErpFinancialInstallment, 'entry_id' | 'installment_num' | 'amount' | 'due_date'>; Update: Partial<ErpFinancialInstallment> }
      erp_invoices: { Row: ErpInvoice; Insert: Partial<ErpInvoice>; Update: Partial<ErpInvoice> }
      erp_invoice_items: { Row: ErpInvoiceItem; Insert: Partial<ErpInvoiceItem> & Pick<ErpInvoiceItem, 'invoice_id' | 'product_id' | 'description' | 'quantity' | 'unit_price' | 'total'>; Update: Partial<ErpInvoiceItem> }
      erp_production_orders: { Row: ErpProductionOrder; Insert: Partial<ErpProductionOrder> & Pick<ErpProductionOrder, 'product_id' | 'quantity' | 'warehouse_id'>; Update: Partial<ErpProductionOrder> }
      erp_production_components: { Row: ErpProductionComponent; Insert: Partial<ErpProductionComponent> & Pick<ErpProductionComponent, 'production_id' | 'component_id' | 'required_qty'>; Update: Partial<ErpProductionComponent> }
      erp_purchase_entries: { Row: ErpPurchaseEntry; Insert: Partial<ErpPurchaseEntry> & Pick<ErpPurchaseEntry, 'supplier_id' | 'warehouse_id'>; Update: Partial<ErpPurchaseEntry> }
      erp_purchase_entry_items: { Row: ErpPurchaseEntryItem; Insert: Partial<ErpPurchaseEntryItem> & Pick<ErpPurchaseEntryItem, 'entry_id' | 'product_id' | 'quantity' | 'unit_cost' | 'total'>; Update: Partial<ErpPurchaseEntryItem> }
      erp_commissions: { Row: ErpCommission; Insert: Partial<ErpCommission> & Pick<ErpCommission, 'salesperson_id' | 'sales_order_id' | 'order_total' | 'commission_rate' | 'commission_value'>; Update: Partial<ErpCommission> }
      erp_settings: { Row: ErpSetting; Insert: ErpSetting; Update: Partial<ErpSetting> }
      erp_payment_accounts: { Row: ErpPaymentAccount; Insert: Partial<ErpPaymentAccount> & Pick<ErpPaymentAccount, 'name' | 'provider'>; Update: Partial<ErpPaymentAccount> }
      erp_payment_account_methods: { Row: ErpPaymentAccountMethod; Insert: Partial<ErpPaymentAccountMethod> & Pick<ErpPaymentAccountMethod, 'account_id' | 'payment_method' | 'installment_min' | 'installment_max'>; Update: Partial<ErpPaymentAccountMethod> }
      erp_bom_components: { Row: ErpBomComponent; Insert: Partial<ErpBomComponent> & Pick<ErpBomComponent, 'parent_id' | 'component_id' | 'quantity'>; Update: Partial<ErpBomComponent> }
      erp_production_workers: { Row: ErpProductionWorker; Insert: Partial<ErpProductionWorker> & Pick<ErpProductionWorker, 'name'>; Update: Partial<ErpProductionWorker> }
      erp_purchase_orders: { Row: ErpPurchaseOrder; Insert: Partial<ErpPurchaseOrder> & Pick<ErpPurchaseOrder, 'supplier_id'>; Update: Partial<ErpPurchaseOrder> }
      erp_purchase_order_items: { Row: ErpPurchaseOrderItem; Insert: Partial<ErpPurchaseOrderItem> & Pick<ErpPurchaseOrderItem, 'purchase_order_id' | 'product_id' | 'quantity' | 'unit_cost_estimated' | 'total_estimated'>; Update: Partial<ErpPurchaseOrderItem> }
      erp_bling_credentials: { Row: ErpBlingCredentials; Insert: Partial<ErpBlingCredentials> & Pick<ErpBlingCredentials, 'company_id' | 'client_id' | 'client_secret'>; Update: Partial<ErpBlingCredentials> }
      erp_product_mirrors: { Row: ErpProductMirror; Insert: Partial<ErpProductMirror> & Pick<ErpProductMirror, 'source_company_id' | 'source_product_id' | 'target_company_id' | 'target_product_id'>; Update: Partial<ErpProductMirror> }
    }
  }
}
