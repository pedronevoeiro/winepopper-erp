import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpOrderStatus } from '@/types/database'

// GET /api/dashboard — dashboard metrics
export async function GET() {
  try {
    const supabase = db()
    const now = new Date()

    // -----------------------------------------------------------------------
    // Revenue this month — from orders that are approved+
    // -----------------------------------------------------------------------
    const activeStatuses: ErpOrderStatus[] = ['approved', 'in_production', 'ready', 'shipped', 'delivered']
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // Fetch all sales orders (we need them for multiple calculations)
    const { data: allOrders } = await supabase
      .from('erp_sales_orders')
      .select('id, order_number, status, total, order_date, contact_id')

    const salesOrders = allOrders ?? []

    const ordersThisMonth = salesOrders.filter((o) => {
      const d = new Date(o.order_date)
      return d >= new Date(thisMonthStart) && d <= new Date(thisMonthEnd) && activeStatuses.includes(o.status as ErpOrderStatus)
    })
    const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.total, 0)

    // -----------------------------------------------------------------------
    // Total orders this month (all statuses)
    // -----------------------------------------------------------------------
    const allOrdersThisMonth = salesOrders.filter((o) => {
      const d = new Date(o.order_date)
      return d >= new Date(thisMonthStart) && d <= new Date(thisMonthEnd)
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
    // Fetch products with their stock
    const { data: productsRaw } = await supabase
      .from('erp_products')
      .select('id, name, sku, stock:erp_stock(quantity, reserved, min_quantity)')

    const lowStock = (productsRaw ?? [])
      .map((p) => {
        const stocks = (p.stock ?? []) as Array<{ quantity: number; reserved: number; min_quantity: number }>
        const totalQty = stocks.reduce((sum, s) => sum + s.quantity, 0)
        const totalReserved = stocks.reduce((sum, s) => sum + s.reserved, 0)
        const minQty = stocks.reduce((sum, s) => sum + s.min_quantity, 0)
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          available: totalQty - totalReserved,
          min_quantity: minQty,
        }
      })
      .filter((p) => p.available < p.min_quantity)

    // -----------------------------------------------------------------------
    // Revenue by month (last 6 months)
    // -----------------------------------------------------------------------
    const revenueByMonth: { month: string; revenue: number; order_count: number }[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = d.getMonth()

      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)

      const monthOrders = salesOrders.filter((o) => {
        const od = new Date(o.order_date)
        return od >= monthStart && od <= monthEnd && activeStatuses.includes(o.status as ErpOrderStatus)
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
    const { data: financialEntries } = await supabase
      .from('erp_financial_entries')
      .select('type, status, amount, paid_amount')

    const feAll = financialEntries ?? []

    const openReceivables = feAll
      .filter((e) => e.type === 'receivable' && (e.status === 'open' || e.status === 'partial'))
      .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

    const openPayables = feAll
      .filter((e) => e.type === 'payable' && (e.status === 'open' || e.status === 'partial' || e.status === 'overdue'))
      .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

    const overdueEntries = feAll.filter((e) => e.status === 'overdue')

    // -----------------------------------------------------------------------
    // Recent orders (last 5)
    // -----------------------------------------------------------------------
    const { data: recentOrdersRaw } = await supabase
      .from('erp_sales_orders')
      .select('id, order_number, status, total, order_date, contact:erp_contacts(name)')
      .order('order_date', { ascending: false })
      .limit(5)

    const recentOrders = (recentOrdersRaw ?? []).map((o) => {
      const contact = o.contact as unknown as { name: string } | null
      return {
        id: o.id,
        order_number: o.order_number,
        contact_name: contact?.name ?? 'N/A',
        status: o.status,
        total: o.total,
        order_date: o.order_date,
      }
    })

    return NextResponse.json({
      revenue_this_month: revenueThisMonth,
      orders_this_month: allOrdersThisMonth.length,
      pending_orders: pendingOrders.length,
      low_stock_items: lowStock,
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
  } catch (err) {
    console.error('GET /api/dashboard unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
