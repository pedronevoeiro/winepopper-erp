import { NextRequest, NextResponse } from 'next/server'
import { financialEntries, contacts } from '@/lib/data'
import type { ErpFinancialType } from '@/types/database'

// GET /api/financial?type=receivable|payable
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const typeFilter = searchParams.get('type') as ErpFinancialType | null
  const accountId = searchParams.get('account_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  let entries = [...financialEntries]

  // Filter by type
  if (typeFilter && (typeFilter === 'receivable' || typeFilter === 'payable')) {
    entries = entries.filter((e) => e.type === typeFilter)
  }

  // Filter by account
  if (accountId) {
    entries = entries.filter((e) => e.account_id === accountId)
  }

  // Filter by date range (based on due_date)
  if (dateFrom) {
    entries = entries.filter((e) => e.due_date >= dateFrom)
  }
  if (dateTo) {
    entries = entries.filter((e) => e.due_date <= dateTo + 'T23:59:59Z')
  }

  // Sort by due_date ascending (closest due dates first)
  entries.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  // Enrich with contact name
  const enriched = entries.map((entry) => {
    const contact = contacts.find((c) => c.id === entry.contact_id)
    return {
      ...entry,
      contact: contact ? { name: contact.name } : null,
    }
  })

  // Summary stats — always computed from all entries (unfiltered)
  const allReceivables = financialEntries.filter((e) => e.type === 'receivable')
  const allPayables = financialEntries.filter((e) => e.type === 'payable')

  const totalReceivable = allReceivables
    .filter((e) => e.status !== 'cancelled')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalReceivablePending = allReceivables
    .filter((e) => e.status !== 'cancelled' && e.status !== 'paid')
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

  const totalReceivablePaid = allReceivables
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + e.paid_amount, 0)

  const totalReceivableOverdue = allReceivables
    .filter((e) => e.status === 'overdue')
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

  const totalPayable = allPayables
    .filter((e) => e.status !== 'cancelled')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalPayablePending = allPayables
    .filter((e) => e.status !== 'cancelled' && e.status !== 'paid')
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

  const totalPayablePaid = allPayables
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + e.paid_amount, 0)

  const totalPayableOverdue = allPayables
    .filter((e) => e.status === 'overdue')
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0)

  const totalOverdue = financialEntries
    .filter((e) => e.status === 'overdue')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalPaid = financialEntries
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + e.paid_amount, 0)

  return NextResponse.json({
    data: enriched,
    count: enriched.length,
    summary: {
      total_receivable: totalReceivable,
      total_receivable_pending: totalReceivablePending,
      total_receivable_paid: totalReceivablePaid,
      total_receivable_overdue: totalReceivableOverdue,
      total_payable: totalPayable,
      total_payable_pending: totalPayablePending,
      total_payable_paid: totalPayablePaid,
      total_payable_overdue: totalPayableOverdue,
      total_overdue: totalOverdue,
      total_paid: totalPaid,
      balance: totalReceivablePending - totalPayablePending,
    },
  })
}
