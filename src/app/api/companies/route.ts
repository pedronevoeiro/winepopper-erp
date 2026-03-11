import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/companies — list active companies
export async function GET() {
  try {
    const { data, error } = await db()
      .from('erp_companies')
      .select('*')
      .eq('active', true)

    if (error) {
      console.error('GET /api/companies error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (err) {
    console.error('GET /api/companies unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// PATCH /api/companies?id=xxx — update an existing company
export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Query param id e obrigatorio.' }, { status: 400 })
    }

    const body = await request.json()
    const now = new Date().toISOString()

    // Build update object from allowed fields
    const allowedFields = [
      'name', 'trade_name', 'document', 'state_reg', 'municipal_reg',
      'email', 'phone', 'cep', 'street', 'number', 'complement',
      'neighborhood', 'city', 'state', 'is_mirror_stock',
    ] as const

    const update: Record<string, unknown> = { updated_at: now }
    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'document') {
          update[field] = typeof body[field] === 'string' ? body[field].replace(/\D/g, '') : body[field]
        } else {
          update[field] = body[field] === '' ? null : body[field]
        }
      }
    }

    const { data, error } = await db()
      .from('erp_companies')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('PATCH /api/companies error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('PATCH /api/companies unexpected error:', err)
    return NextResponse.json({ error: 'Corpo da requisicao invalido.' }, { status: 400 })
  }
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

    const cleanDocument = body.document.replace(/\D/g, '')

    // Check for duplicate document
    const { data: existing } = await db()
      .from('erp_companies')
      .select('id')
      .eq('document', cleanDocument)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Ja existe uma empresa com este CNPJ.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    const { data: newCompany, error } = await db()
      .from('erp_companies')
      .insert({
        name: body.name,
        trade_name: body.trade_name ?? null,
        document: cleanDocument,
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
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/companies error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: newCompany }, { status: 201 })
  } catch (err) {
    console.error('POST /api/companies unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
