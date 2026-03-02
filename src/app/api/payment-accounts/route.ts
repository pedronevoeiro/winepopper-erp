import { NextRequest, NextResponse } from 'next/server'
import { paymentAccounts, paymentAccountMethods } from '@/lib/data'
import type { ErpPaymentAccount, ErpPaymentAccountMethod, ErpPaymentMethod } from '@/types/database'

// GET /api/payment-accounts
// Returns all payment accounts with their supported methods joined.
export async function GET() {
  const data = paymentAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    provider: account.provider,
    active: account.active,
    notes: account.notes,
    methods: paymentAccountMethods
      .filter((m) => m.account_id === account.id)
      .map((m) => ({
        id: m.id,
        payment_method: m.payment_method,
        tax_percentage: m.tax_percentage,
        tax_fixed: m.tax_fixed,
        installment_min: m.installment_min,
        installment_max: m.installment_max,
        active: m.active,
      })),
  }))

  return NextResponse.json({ data })
}

// POST /api/payment-accounts
// Creates a new payment account.
// Body: { name, provider, notes?, methods?: [{ payment_method, tax_percentage, tax_fixed }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.provider) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, provider' },
        { status: 400 }
      )
    }

    // Check for duplicate provider slug
    const existing = paymentAccounts.find((a) => a.provider === body.provider)
    if (existing) {
      return NextResponse.json(
        { error: `Já existe uma conta com o provider "${body.provider}".` },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const newAccount: ErpPaymentAccount = {
      id: crypto.randomUUID(),
      name: body.name,
      provider: body.provider,
      active: true,
      notes: body.notes ?? null,
      created_at: now,
      updated_at: now,
    }

    // Create methods if provided
    const newMethods: ErpPaymentAccountMethod[] = []
    if (body.methods && Array.isArray(body.methods)) {
      for (const m of body.methods) {
        if (!m.payment_method) {
          return NextResponse.json(
            { error: 'Cada método precisa ter payment_method.' },
            { status: 400 }
          )
        }

        // Check for duplicate method within this request
        const duplicate = newMethods.find(
          (nm) => nm.payment_method === m.payment_method
        )
        if (duplicate) {
          return NextResponse.json(
            { error: `Método duplicado: "${m.payment_method}" aparece mais de uma vez.` },
            { status: 400 }
          )
        }

        const newMethod: ErpPaymentAccountMethod = {
          id: crypto.randomUUID(),
          account_id: newAccount.id,
          payment_method: m.payment_method as ErpPaymentMethod,
          tax_percentage: Number(m.tax_percentage ?? 0),
          tax_fixed: Number(m.tax_fixed ?? 0),
          installment_min: Number(m.installment_min ?? 1),
          installment_max: Number(m.installment_max ?? 1),
          active: true,
        }
        newMethods.push(newMethod)
      }
    }

    // Push to in-memory arrays
    paymentAccounts.push(newAccount)
    paymentAccountMethods.push(...newMethods)

    return NextResponse.json(
      {
        data: {
          id: newAccount.id,
          name: newAccount.name,
          provider: newAccount.provider,
          active: newAccount.active,
          notes: newAccount.notes,
          methods: newMethods.map((m) => ({
            id: m.id,
            payment_method: m.payment_method,
            tax_percentage: m.tax_percentage,
            tax_fixed: m.tax_fixed,
            active: m.active,
          })),
        },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}

// PATCH /api/payment-accounts
// Toggle active status of a payment account.
// Body: { id, active }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Campo obrigatório: id' },
        { status: 400 }
      )
    }

    const account = paymentAccounts.find((a) => a.id === body.id)
    if (!account) {
      return NextResponse.json(
        { error: `Conta não encontrada: ${body.id}` },
        { status: 404 }
      )
    }

    if (typeof body.active === 'boolean') {
      account.active = body.active
    }
    account.updated_at = new Date().toISOString()

    return NextResponse.json({ data: { id: account.id, active: account.active } })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}
