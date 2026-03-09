// =============================================================================
// LOCAL DATA STORE — previously held mock data, now cleared.
// All real data comes from Supabase via API routes.
// Companies array is kept as reference data.
// Helper functions and type re-exports are preserved for compatibility.
// =============================================================================

import type {
  ErpCompany,
  ErpContact,
  ErpSalesperson,
  ErpProduct,
  ErpProductVariation,
  ErpWarehouse,
  ErpStock,
  ErpSalesOrder,
  ErpSalesOrderItem,
  ErpFinancialEntry,
  ErpCommission,
  ErpProductionOrder,
  ErpProductionStatus,
  ErpProductionComponent,
  ErpBomComponent,
  ErpProductionWorker,
  ErpUserProfile,
  ErpPaymentAccount,
  ErpPaymentAccountMethod,
  ErpPurchaseEntry,
  ErpPurchaseEntryItem,
  ErpStockMovement,
  ErpPurchaseOrder,
  ErpPurchaseOrderItem,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Helper: datas relativas
// ---------------------------------------------------------------------------
function daysAgo(_days: number): string {
  return new Date().toISOString()
}

function daysFromNow(_days: number): string {
  return new Date().toISOString()
}

// Suppress unused warnings
void daysAgo
void daysFromNow

// ---------------------------------------------------------------------------
// COMPANIES (kept — used as reference data)
// ---------------------------------------------------------------------------
export const companies: ErpCompany[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Easy Wine Utensilios Domesticos LTDA',
    trade_name: 'Winepopper',
    document: '34227106000144',
    state_reg: '126.402.199.110',
    municipal_reg: null,
    email: 'contato@winepopper.com.br',
    phone: '(19) 3255-0001',
    cep: '13500-171',
    street: 'Rua 4',
    number: '1850',
    complement: null,
    neighborhood: 'Zona Central',
    city: 'Rio Claro',
    state: 'SP',
    ibge_code: '3543907',
    logo_url: null,
    active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Hamecon Comercio e Utensilios Domesticos LTDA',
    trade_name: 'Hamecon',
    document: '61708573000169',
    state_reg: '587.554.781.118',
    municipal_reg: null,
    email: 'contato@hamecon.com.br',
    phone: '(19) 3255-0002',
    cep: '13501-060',
    street: 'Rua 5',
    number: 'Cj 361',
    complement: null,
    neighborhood: 'Cidade Jardim',
    city: 'Rio Claro',
    state: 'SP',
    ibge_code: '3543907',
    logo_url: null,
    active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// CLEARED MOCK DATA — all arrays emptied (real data comes from Supabase)
// ---------------------------------------------------------------------------
export const contacts: ErpContact[] = []
export const salespeople: ErpSalesperson[] = []
export const products: ErpProduct[] = []
export const productVariations: ErpProductVariation[] = []
export const bomComponents: ErpBomComponent[] = []
export const productionWorkers: ErpProductionWorker[] = []
export const warehouses: ErpWarehouse[] = []
export const stock: ErpStock[] = []
export const salesOrders: ErpSalesOrder[] = []
export const salesOrderItems: ErpSalesOrderItem[] = []
export const financialEntries: ErpFinancialEntry[] = []
export const commissions: ErpCommission[] = []
export const users: ErpUserProfile[] = []
export const productionOrders: ErpProductionOrder[] = []
export const productionComponents: ErpProductionComponent[] = []
export const purchaseEntries: ErpPurchaseEntry[] = []
export const purchaseEntryItems: ErpPurchaseEntryItem[] = []
export const stockMovements: ErpStockMovement[] = []
export const purchaseOrders: ErpPurchaseOrder[] = []
export const purchaseOrderItems: ErpPurchaseOrderItem[] = []
export const auditLog: { id: string; user_id: string | null; action: string; entity_type: string; entity_id: string; changes: Record<string, unknown> | null; created_at: string }[] = []
export const paymentAccounts: ErpPaymentAccount[] = []
export const paymentAccountMethods: ErpPaymentAccountMethod[] = []

// ---------------------------------------------------------------------------
// HELPER: Orders with relations (operates on local mock data — now returns [])
// ---------------------------------------------------------------------------
export interface SalesOrderWithRelations extends ErpSalesOrder {
  contact: ErpContact | null
  salesperson: ErpSalesperson | null
  company: ErpCompany | null
  items: ErpSalesOrderItem[]
}

export function getOrdersWithRelations(): SalesOrderWithRelations[] {
  return salesOrders.map((order) => ({
    ...order,
    contact: contacts.find((c) => c.id === order.contact_id) ?? null,
    salesperson: salespeople.find((s) => s.id === order.salesperson_id) ?? null,
    company: companies.find((co) => co.id === order.company_id) ?? null,
    items: salesOrderItems.filter((item) => item.order_id === order.id),
  }))
}

// ---------------------------------------------------------------------------
// HELPER: Producible quantity
// ---------------------------------------------------------------------------
export function getProducibleQuantity(productId: string): number {
  const bom = bomComponents.filter(b => b.parent_id === productId)
  if (bom.length === 0) return 0

  return Math.min(
    ...bom.map(component => {
      const productStock = stock.filter(s => s.product_id === component.component_id)
      const totalAvailable = productStock.reduce((sum, s) => sum + s.quantity - s.reserved, 0)
      return Math.floor(totalAvailable / component.quantity)
    })
  )
}

// ---------------------------------------------------------------------------
// HELPER: Products with stock info
// ---------------------------------------------------------------------------
export interface ProductWithStock extends ErpProduct {
  stock_quantity: number
  stock_reserved: number
  stock_available: number
  min_quantity: number
  variations: ErpProductVariation[]
  producible_quantity: number
}

export function getProductsWithStock(): ProductWithStock[] {
  return products.map((product) => {
    const productStocks = stock.filter((st) => st.product_id === product.id)
    const totalQty = productStocks.reduce((sum, s) => sum + s.quantity, 0)
    const totalReserved = productStocks.reduce((sum, s) => sum + s.reserved, 0)
    const minQty = productStocks.reduce((sum, s) => sum + s.min_quantity, 0)
    const variations = productVariations.filter(v => v.product_id === product.id)
    return {
      ...product,
      stock_quantity: totalQty,
      stock_reserved: totalReserved,
      stock_available: totalQty - totalReserved,
      min_quantity: minQty,
      variations,
      producible_quantity: product.product_type === 'produto_final' ? getProducibleQuantity(product.id) : 0,
    }
  })
}

// Suppress unused type warnings
void (undefined as unknown as ErpProductionStatus)
