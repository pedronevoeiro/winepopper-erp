import { NextRequest, NextResponse } from 'next/server'
import { contacts } from '@/lib/data'
import type { ErpContact, ErpContactType } from '@/types/database'

// GET /api/contacts?q=xxx&type=customer|supplier
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')?.toLowerCase() ?? ''
  const typeFilter = searchParams.get('type') as ErpContactType | null

  let result = [...contacts]

  // Filter by type
  if (typeFilter && (typeFilter === 'customer' || typeFilter === 'supplier')) {
    result = result.filter((c) => c.type === typeFilter || c.type === 'both')
  }

  // Search by name, trade_name, document, email, city
  if (query) {
    result = result.filter((c) => {
      const searchable = [
        c.name,
        c.trade_name,
        c.document,
        c.email,
        c.city,
        c.state,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(query)
    })
  }

  return NextResponse.json({
    data: result,
    count: result.length,
  })
}

// POST /api/contacts — create a new contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.document) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, document' },
        { status: 400 }
      )
    }

    // Check for duplicate document
    const existing = contacts.find((c) => c.document === body.document.replace(/\D/g, ''))
    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um contato com este documento.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const newContact: ErpContact = {
      id: crypto.randomUUID(),
      type: body.type ?? 'customer',
      person_type: body.person_type ?? 'PJ',
      name: body.name,
      trade_name: body.trade_name ?? null,
      document: body.document.replace(/\D/g, ''),
      state_reg: body.state_reg ?? null,
      municipal_reg: body.municipal_reg ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      mobile: body.mobile ?? null,
      website: body.website ?? null,
      cep: body.cep ?? null,
      street: body.street ?? null,
      number: body.number ?? null,
      complement: body.complement ?? null,
      neighborhood: body.neighborhood ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      ibge_code: body.ibge_code ?? null,
      notes: body.notes ?? null,
      active: true,
      salesperson_id: body.salesperson_id ?? null,
      created_at: now,
      updated_at: now,
    }

    // Add to in-memory array (won't persist across restarts)
    contacts.push(newContact)

    return NextResponse.json({ data: newContact }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}
