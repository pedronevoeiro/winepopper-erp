import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpFinancialType } from '@/types/database'

// GET /api/financial?type=receivable|payable
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const typeFilter = searchParams.get('type') as ErpFinancialType | null
    const accountId = searchParams.get('account_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const supabase = db()

    // Build filtered query
    let query = supabase
      .from('erp_financial_entries')
      .select('*, contact:erp_contacts(name)')
      .order('due_date', { ascending: true })

    if (typeFilter && (typeFilter === 'receivable' || typeFilter === 'payable')) {
      query = query.eq('type', typeFilter)
    }

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (dateFrom) {
      query = query.gte('due_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('due_date', dateTo + 'T23:59:59Z')
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('GET /api/financial error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten contact for API contract compatibility
    const enriched = (entries ?? []).map((entry) => {
      const contact = entry.contact as { name: string } | null
      return {
        ...entry,
        contact: contact ? { name: contact.name } : null,
      }
    })

    // Summary stats — always computed from ALL entries (unfiltered)
    const { data: allEntries, error: summaryErr } = await supabase
      .from('erp_financial_entries')
      .select('type, status, amount, paid_amount')

    if (summaryErr) {
      console.error('GET /api/financial summary error:', summaryErr)
    }

    const all = allEntries ?? []
    const allReceivables = all.filter((e) => e.type === 'receivable')
    const allPayables = all.filter((e) => e.type === 'payable')

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

    const totalOverdue = all
      .filter((e) => e.status === 'overdue')
      .reduce((sum, e) => sum + e.amount, 0)

    const totalPaid = all
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
  } catch (err) {
    console.error('GET /api/financial unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
