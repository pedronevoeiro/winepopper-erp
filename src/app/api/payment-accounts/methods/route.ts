import { NextRequest, NextResponse } from 'next/server'
import { paymentAccounts, paymentAccountMethods } from '@/lib/data'
import type { ErpPaymentAccountMethod, ErpPaymentMethod } from '@/types/database'

// POST /api/payment-accounts/methods
// Add a new method to an account.
// Body: { account_id, payment_method, tax_percentage, tax_fixed }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.account_id || !body.payment_method) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: account_id, payment_method' },
        { status: 400 }
      )
    }

    // Validate account exists
    const account = paymentAccounts.find((a) => a.id === body.account_id)
    if (!account) {
      return NextResponse.json(
        { error: `Conta de pagamento não encontrada: ${body.account_id}` },
        { status: 404 }
      )
    }

    // Validate no duplicate (same account + same method + same installment range)
    const instMin = Number(body.installment_min ?? 1)
    const instMax = Number(body.installment_max ?? 1)
    const duplicate = paymentAccountMethods.find(
      (m) =>
        m.account_id === body.account_id &&
        m.payment_method === body.payment_method &&
        m.installment_min === instMin &&
        m.installment_max === instMax
    )
    if (duplicate) {
      const rangeLabel = instMin === instMax ? `${instMin}x` : `${instMin}-${instMax}x`
      return NextResponse.json(
        { error: `O método "${body.payment_method}" (${rangeLabel}) já existe para a conta "${account.name}".` },
        { status: 409 }
      )
    }

    const newMethod: ErpPaymentAccountMethod = {
      id: crypto.randomUUID(),
      account_id: body.account_id,
      payment_method: body.payment_method as ErpPaymentMethod,
      tax_percentage: Number(body.tax_percentage ?? 0),
      tax_fixed: Number(body.tax_fixed ?? 0),
      installment_min: instMin,
      installment_max: instMax,
      active: true,
    }

    // Push to in-memory array
    paymentAccountMethods.push(newMethod)

    return NextResponse.json({ data: newMethod }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}

// DELETE /api/payment-accounts/methods?id=xxx
// Remove a method by ID.
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Query param obrigatório: id' },
      { status: 400 }
    )
  }

  const index = paymentAccountMethods.findIndex((m) => m.id === id)
  if (index === -1) {
    return NextResponse.json(
      { error: `Método não encontrado: ${id}` },
      { status: 404 }
    )
  }

  // Remove from array
  paymentAccountMethods.splice(index, 1)

  return NextResponse.json({ success: true })
}
