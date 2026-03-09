import type { ErpOrderStatus, ErpFinancialStatus, ErpProductionStatus, ErpCommissionStatus, ErpInvoiceStatus, ErpProductType, ErpProductStructure, ErpPurchaseOrderStatus } from '@/types/database'

// Labels e cores para tipos de produto
export const PRODUCT_TYPE_LABELS: Record<ErpProductType, string> = {
  produto_final: 'Produto Final',
  insumo: 'Insumo',
  ativo_imobilizado: 'Ativo Imobilizado',
}

export const PRODUCT_TYPE_COLORS: Record<ErpProductType, string> = {
  produto_final: 'bg-blue-100 text-blue-800',
  insumo: 'bg-amber-100 text-amber-800',
  ativo_imobilizado: 'bg-purple-100 text-purple-800',
}

// Labels e cores para estrutura de produto
export const PRODUCT_STRUCTURE_LABELS: Record<ErpProductStructure, string> = {
  simples: 'Simples',
  composto: 'Composto',
  com_variacoes: 'Com Variações',
}

export const PRODUCT_STRUCTURE_COLORS: Record<ErpProductStructure, string> = {
  simples: 'bg-gray-100 text-gray-700',
  composto: 'bg-teal-100 text-teal-800',
  com_variacoes: 'bg-violet-100 text-violet-800',
}

// Labels e cores para status de pedido de compra
export const PURCHASE_ORDER_STATUS_LABELS: Record<ErpPurchaseOrderStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  partial: 'Recebido Parcial',
  received: 'Recebido',
  cancelled: 'Cancelado',
}

export const PURCHASE_ORDER_STATUS_COLORS: Record<ErpPurchaseOrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

// Labels em português para status
export const ORDER_STATUS_LABELS: Record<ErpOrderStatus, string> = {
  draft: 'Rascunho',
  pending: 'Em Aberto',
  approved: 'Aprovado',
  in_production: 'Em Produção',
  ready: 'Pronto p/ Envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  returned: 'Devolvido',
}

export const ORDER_STATUS_COLORS: Record<ErpOrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  ready: 'bg-cyan-100 text-cyan-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-orange-100 text-orange-800',
}

export const FINANCIAL_STATUS_LABELS: Record<ErpFinancialStatus, string> = {
  open: 'Em Aberto',
  partial: 'Parcial',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
}

export const FINANCIAL_STATUS_COLORS: Record<ErpFinancialStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
}

export const PRODUCTION_STATUS_LABELS: Record<ErpProductionStatus, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

export const PRODUCTION_STATUS_COLORS: Record<ErpProductionStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const COMMISSION_STATUS_LABELS: Record<ErpCommissionStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  paid: 'Paga',
  cancelled: 'Cancelada',
}

export const COMMISSION_STATUS_COLORS: Record<ErpCommissionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const INVOICE_STATUS_LABELS: Record<ErpInvoiceStatus, string> = {
  draft: 'Rascunho',
  processing: 'Processando',
  authorized: 'Autorizada',
  cancelled: 'Cancelada',
  denied: 'Rejeitada',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  credit_card: 'Cartão de Crédito',
  transfer: 'Transferência',
  cash: 'Dinheiro',
  check: 'Cheque',
  other: 'Outro',
}

// Formatação de moeda brasileira
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formatação de data brasileira
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))
}

// Formatar CPF/CNPJ
export function formatDocument(doc: string): string {
  const digits = doc.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return doc
}
