import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpPaymentMethod } from '@/types/database'

// POST /api/payment-accounts/methods
// Add a new method to an account.
// Body: { account_id, payment_method, tax_percentage, tax_fixed }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    // Validate required fields
    if (!body.account_id || !body.payment_method) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: account_id, payment_method' },
        { status: 400 }
      )
    }

    // Validate account exists
    const { data: account, error: accErr } = await supabase
      .from('erp_payment_accounts')
      .select('name')
      .eq('id', body.account_id)
      .single()

    if (accErr || !account) {
      return NextResponse.json(
        { error: `Conta de pagamento não encontrada: ${body.account_id}` },
        { status: 404 }
      )
    }

    // Validate no duplicate (same account + same method + same installment range)
    const instMin = Number(body.installment_min ?? 1)
    const instMax = Number(body.installment_max ?? 1)

    const { data: duplicate } = await supabase
      .from('erp_payment_account_methods')
      .select('id')
      .eq('account_id', body.account_id)
      .eq('payment_method', body.payment_method)
      .eq('installment_min', instMin)
      .eq('installment_max', instMax)
      .limit(1)
      .maybeSingle()

    if (duplicate) {
      const rangeLabel = instMin === instMax ? `${instMin}x` : `${instMin}-${instMax}x`
      return NextResponse.json(
        { error: `O método "${body.payment_method}" (${rangeLabel}) já existe para a conta "${account.name}".` },
        { status: 409 }
      )
    }

    const { data: newMethod, error } = await supabase
      .from('erp_payment_account_methods')
      .insert({
        account_id: body.account_id,
        payment_method: body.payment_method as ErpPaymentMethod,
        tax_percentage: Number(body.tax_percentage ?? 0),
        tax_fixed: Number(body.tax_fixed ?? 0),
        installment_min: instMin,
        installment_max: instMax,
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/payment-accounts/methods error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: newMethod }, { status: 201 })
  } catch (err) {
    console.error('POST /api/payment-accounts/methods unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}

// DELETE /api/payment-accounts/methods?id=xxx
// Remove a method by ID.
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Query param obrigatório: id' },
        { status: 400 }
      )
    }

    // Check existence
    const { data: existing, error: checkErr } = await db()
      .from('erp_payment_account_methods')
      .select('id')
      .eq('id', id)
      .single()

    if (checkErr || !existing) {
      return NextResponse.json(
        { error: `Método não encontrado: ${id}` },
        { status: 404 }
      )
    }

    const { error } = await db()
      .from('erp_payment_account_methods')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('DELETE /api/payment-accounts/methods error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/payment-accounts/methods unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
