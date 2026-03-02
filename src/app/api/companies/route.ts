import { NextRequest, NextResponse } from 'next/server'
import { companies } from '@/lib/data'
import type { ErpCompany } from '@/types/database'

// GET /api/companies — list active companies
export async function GET() {
  const active = companies.filter((c) => c.active)

  return NextResponse.json({
    data: active,
    count: active.length,
  })
}

// POST /api/companies — create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.document) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: name, document' },
        { status: 400 }
      )
    }

    // Check for duplicate document
    const existing = companies.find(
      (c) => c.document === body.document.replace(/\D/g, '')
    )
    if (existing) {
      return NextResponse.json(
        { error: 'Ja existe uma empresa com este CNPJ.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const newCompany: ErpCompany = {
      id: crypto.randomUUID(),
      name: body.name,
      trade_name: body.trade_name ?? null,
      document: body.document.replace(/\D/g, ''),
      state_reg: body.state_reg ?? null,
      municipal_reg: body.municipal_reg ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      cep: body.cep ?? null,
      street: body.street ?? null,
      number: body.number ?? null,
      complement: body.complement ?? null,
      neighborhood: body.neighborhood ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      ibge_code: null,
      logo_url: null,
      active: true,
      created_at: now,
      updated_at: now,
    }

    // Add to in-memory array (won't persist across restarts)
    companies.push(newCompany)

    return NextResponse.json({ data: newCompany }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
