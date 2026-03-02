import { NextRequest, NextResponse } from 'next/server'
import { users } from '@/lib/data'
import type { ErpUserProfile, ErpUserRole } from '@/types/database'

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
  return NextResponse.json({
    data: users,
    count: users.length,
  })
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

    // Check for duplicate email
    const existing = users.find(
      (u) => u.email.toLowerCase() === body.email.toLowerCase()
    )
    if (existing) {
      return NextResponse.json(
        { error: 'Ja existe um usuario com este e-mail.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const newUser: ErpUserProfile = {
      id: crypto.randomUUID(),
      email: body.email,
      display_name: body.display_name,
      role: body.role,
      phone: body.phone ?? null,
      active: body.active ?? true,
      default_company_id: body.default_company_id ?? null,
      created_at: now,
      updated_at: now,
    }

    // Add to in-memory array (won't persist across restarts)
    users.push(newUser)

    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
