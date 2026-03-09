import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpContactType } from '@/types/database'

// GET /api/contacts?q=xxx&type=customer|supplier
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const query = searchParams.get('q')?.toLowerCase() ?? ''
    const typeFilter = searchParams.get('type') as ErpContactType | null

    let dbQuery = db()
      .from('erp_contacts')
      .select('*')

    // Filter by type
    if (typeFilter && (typeFilter === 'customer' || typeFilter === 'supplier')) {
      dbQuery = dbQuery.or(`type.eq.${typeFilter},type.eq.both`)
    }

    // Search by name, trade_name, document, email, city
    if (query) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,trade_name.ilike.%${query}%,document.ilike.%${query}%,email.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`
      )
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error('GET /api/contacts error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (err) {
    console.error('GET /api/contacts unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
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

    const cleanDocument = body.document.replace(/\D/g, '')

    // Check for duplicate document
    const { data: existing } = await db()
      .from('erp_contacts')
      .select('id')
      .eq('document', cleanDocument)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um contato com este documento.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    const { data: newContact, error } = await db()
      .from('erp_contacts')
      .insert({
        type: body.type ?? 'customer',
        person_type: body.person_type ?? 'PJ',
        name: body.name,
        trade_name: body.trade_name ?? null,
        document: cleanDocument,
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
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/contacts error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: newContact }, { status: 201 })
  } catch (err) {
    console.error('POST /api/contacts unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 }
    )
  }
}
