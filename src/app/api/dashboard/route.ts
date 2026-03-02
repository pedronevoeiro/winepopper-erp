import { NextResponse } from 'next/server'
import {
  salesOrders,
  financialEntries,
  getProductsWithStock,
  getOrdersWithRelations,
} from '@/lib/data'
import type { ErpOrderStatus } from '@/types/database'

// GET /api/dashboard — dashboard metrics
export async function GET() {
  const now = new Date('2026-03-01T10:00:00Z')

  // -----------------------------------------------------------------------
  // Revenue this month (March 2026) — from orders that are approved+
  // -----------------------------------------------------------------------
  const activeStatuses: ErpOrderStatus[] = ['approved', 'in_production', 'ready', 'shipped', 'delivered']
  const thisMonthStart = new Date('2026-03-01T00:00:00Z')
  const thisMonthEnd = new Date('2026-03-31T23:59:59Z')

  // "Revenue this month" = total de pedidos com order_date em março e status ativo
  const ordersThisMonth = salesOrders.filter((o) => {
    const d = new Date(o.order_date)
    return d >= thisMonthStart && d <= thisMonthEnd && activeStatuses.includes(o.status)
  })
  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.total, 0)

  // -----------------------------------------------------------------------
  // Total orders this month (all statuses)
  // -----------------------------------------------------------------------
  const allOrdersThisMonth = salesOrders.filter((o) => {
    const d = new Date(o.order_date)
    return d >= thisMonthStart && d <= thisMonthEnd
  })

  // -----------------------------------------------------------------------
  // Pending orders (status = draft | pending)
  // -----------------------------------------------------------------------
  const pendingOrders = salesOrders.filter(
    (o) => o.status === 'draft' || o.status === 'pending'
  )

  // -----------------------------------------------------------------------
  // Low stock items (quantity - reserved < min_quantity)
  // -----------------------------------------------------------------------
  const productsWithStock = getProductsWithStock()
  const lowStock = productsWithStock.filter(
    (p) => p.stock_available < p.min_quantity
  )

  // -----------------------------------------------------------------------
  // Revenue by month (last 6 months)
  // -----------------------------------------------------------------------
  const revenueByMonth: { month: string; revenue: number; order_count: number }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    const year = d.getFullYear()
    const month = d.getMonth() // 0-indexed

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)

    const monthOrders = salesOrders.filter((o) => {
      const od = new Date(o.order_date)
      return od >= monthStart && od <= monthEnd && activeStatuses.includes(o.status)
    })

    const monthLabel = `${year}-${String(month + 1).padStart(2, '0')}`

    revenueByMonth.push({
      month: monthLabel,
      revenue: monthOrders.reduce((sum, o) => sum + o.total, 0),
      order_count: monthOrders.length,
    })
  }

  // -----------------------------------------------------------------------
  // Orders by status breakdown
  // -----------------------------------------------------------------------
  const statusCounts: Record<string, number> = {}
  for (const order of salesOrders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1
  }

  // -----------------------------------------------------------------------
  // Financial summary
  // -----------------------------------------------------------------------
  const openReceivables = financialEntries
    .filter((e) => e.type === 'receivable' && (e.status === 'open' || e.status === 'partial'))
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

  const openPayables = financialEntries
    .filter((e) => e.type === 'payable' && (e.status === 'open' || e.status === 'partial' || e.status === 'overdue'))
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

  const overdueEntries = financialEntries.filter((e) => e.status === 'overdue')

  // -----------------------------------------------------------------------
  // Recent orders (last 5)
  // -----------------------------------------------------------------------
  const recentOrders = getOrdersWithRelations()
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      order_number: o.order_number,
      contact_name: o.contact?.name ?? 'N/A',
      status: o.status,
      total: o.total,
      order_date: o.order_date,
    }))

  return NextResponse.json({
    revenue_this_month: revenueThisMonth,
    orders_this_month: allOrdersThisMonth.length,
    pending_orders: pendingOrders.length,
    low_stock_items: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      available: p.stock_available,
      min_quantity: p.min_quantity,
    })),
    revenue_by_month: revenueByMonth,
    orders_by_status: statusCounts,
    financial: {
      open_receivables: openReceivables,
      open_payables: openPayables,
      overdue_count: overdueEntries.length,
      overdue_total: overdueEntries.reduce((sum, e) => sum + (e.amount - e.paid_amount), 0),
    },
    recent_orders: recentOrders,
  })
}
