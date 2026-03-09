import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ErpUserRole } from '@/types/database'

const VALID_ROLES: ErpUserRole[] = [
  'admin',
  'manager',
  'vendedor',
  'financeiro',
  'producao',
  'viewer',
]

// GET /api/users — list all users
export async function GET() {
  try {
    const { data, error } = await db()
      .from('erp_user_profiles')
      .select('*')

    if (error) {
      console.error('GET /api/users error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (err) {
    console.error('GET /api/users unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

// POST /api/users — create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.display_name || !body.email || !body.role) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: display_name, email, role' },
        { status: 400 }
      )
    }

    // Validate role
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `Papel invalido. Valores aceitos: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = db()

    // Check for duplicate email
    const { data: existing } = await supabase
      .from('erp_user_profiles')
      .select('id')
      .ilike('email', body.email)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Ja existe um usuario com este e-mail.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    const { data: newUser, error } = await supabase
      .from('erp_user_profiles')
      .insert({
        email: body.email,
        display_name: body.display_name,
        role: body.role,
        phone: body.phone ?? null,
        active: body.active ?? true,
        default_company_id: body.default_company_id ?? null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/users error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (err) {
    console.error('POST /api/users unexpected error:', err)
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
