import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpPaymentMethod } from '@/types/database'

// GET /api/payment-accounts
// Returns all payment accounts with their supported methods joined.
export async function GET() {
  try {
    const { data, error } = await db()
      .from('erp_payment_accounts')
      .select('*, methods:erp_payment_account_methods(*)')

    if (error) {
      console.error('GET /api/payment-accounts error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reshape to match API contract
    const result = (data ?? []).map((account) => ({
      id: account.id,
      name: account.name,
      provider: account.provider,
      active: account.active,
      notes: account.notes,
      methods: ((account.methods ?? []) as Array<Record<string, unknown>>).map((m) => ({
        id: m.id,
        payment_method: m.payment_method,
        tax_percentage: m.tax_percentage,
        tax_fixed: m.tax_fixed,
        installment_min: m.installment_min,
        installment_max: m.installment_max,
        active: m.active,
      })),
    }))

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('GET /api/payment-accounts unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/payment-accounts
// Creates a new payment account.
// Body: { name, provider, notes?, methods?: [{ payment_method, tax_percentage, tax_fixed }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = db()

    // Validate required fields
    if (!body.name || !body.provider) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, provider' },
        { status: 400 }
      )
    }

    // Check for duplicate provider slug
    const { data: existing } = await supabase
      .from('erp_payment_accounts')
      .select('id')
      .eq('provider', body.provider)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Já existe uma conta com o provider "${body.provider}".` },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    // Insert account
    const { data: newAccount, error: accountErr } = await supabase
      .from('erp_payment_accounts')
      .insert({
        name: body.name,
        provider: body.provider,
        active: true,
        notes: body.notes ?? null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (accountErr || !newAccount) {
      console.error('POST /api/payment-accounts insert error:', accountErr)
      return NextResponse.json({ error: accountErr?.message ?? 'Erro ao criar conta.' }, { status: 500 })
    }

    // Create methods if provided
    let newMethods: Array<Record<string, unknown>> = []
    if (body.methods && Array.isArray(body.methods)) {
      // Validate methods
      const seenMethods = new Set<string>()
      for (const m of body.methods) {
        if (!m.payment_method) {
          return NextResponse.json(
            { error: 'Cada método precisa ter payment_method.' },
            { status: 400 }
          )
        }

        if (seenMethods.has(m.payment_method)) {
          return NextResponse.json(
            { error: `Método duplicado: "${m.payment_method}" aparece mais de uma vez.` },
            { status: 400 }
          )
        }
        seenMethods.add(m.payment_method)
      }

      const methodInserts = body.methods.map((m: Record<string, unknown>) => ({
        account_id: newAccount.id,
        payment_method: m.payment_method as ErpPaymentMethod,
        tax_percentage: Number(m.tax_percentage ?? 0),
        tax_fixed: Number(m.tax_fixed ?? 0),
        installment_min: Number(m.installment_min ?? 1),
        installment_max: Number(m.installment_max ?? 1),
        active: true,
      }))

      const { data: methods, error: methodsErr } = await supabase
        .from('erp_payment_account_methods')
        .insert(methodInserts)
        .select()

      if (methodsErr) {
        console.error('POST /api/payment-accounts insert methods error:', methodsErr)
      }
      newMethods = methods ?? []
    }

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
  } catch (err) {
    console.error('POST /api/payment-accounts unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}

// PATCH /api/payment-accounts
// Update a payment account.
// Body: { id, active?, name?, provider?, notes? }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Campo obrigatório: id' },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.active === 'boolean') {
      updatePayload.active = body.active
    }
    if (typeof body.name === 'string') {
      updatePayload.name = body.name
    }
    if (typeof body.provider === 'string') {
      updatePayload.provider = body.provider
    }
    if (body.notes !== undefined) {
      updatePayload.notes = body.notes
    }

    const { data: updated, error } = await db()
      .from('erp_payment_accounts')
      .update(updatePayload)
      .eq('id', body.id)
      .select('id, name, provider, active, notes')
      .single()

    if (error || !updated) {
      console.error('PATCH /api/payment-accounts error:', error)
      return NextResponse.json(
        { error: `Conta não encontrada: ${body.id}` },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('PATCH /api/payment-accounts unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}

// DELETE /api/payment-accounts?id=xxx
// Delete a payment account and all its methods.
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

    const supabase = db()

    // Check existence
    const { data: existing, error: checkErr } = await supabase
      .from('erp_payment_accounts')
      .select('id')
      .eq('id', id)
      .single()

    if (checkErr || !existing) {
      return NextResponse.json(
        { error: `Conta não encontrada: ${id}` },
        { status: 404 }
      )
    }

    // Delete all methods first
    await supabase
      .from('erp_payment_account_methods')
      .delete()
      .eq('account_id', id)

    // Delete the account
    const { error } = await supabase
      .from('erp_payment_accounts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('DELETE /api/payment-accounts error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/payment-accounts unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
