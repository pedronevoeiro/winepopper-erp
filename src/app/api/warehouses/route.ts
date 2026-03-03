import { NextRequest, NextResponse } from 'next/server'
import { warehouses } from '@/lib/data'
import type { ErpWarehouse } from '@/types/database'

// GET /api/warehouses — list all warehouses
export async function GET() {
  return NextResponse.json({
    data: warehouses,
    count: warehouses.length,
  })
}

// POST /api/warehouses — create a new warehouse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, address, active } = body

    if (!name?.trim() || !code?.trim()) {
      return NextResponse.json(
        { error: 'Nome e codigo sao obrigatorios.' },
        { status: 400 }
      )
    }

    if (warehouses.some((w) => w.code === code.trim())) {
      return NextResponse.json(
        { error: 'Codigo ja existe.' },
        { status: 400 }
      )
    }

    const newWarehouse: ErpWarehouse = {
      id: crypto.randomUUID(),
      name: name.trim(),
      code: code.trim(),
      address: address?.trim() || null,
      active: active ?? true,
      created_at: new Date().toISOString(),
    }

    warehouses.push(newWarehouse)

    return NextResponse.json({ data: newWarehouse }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}

// PATCH /api/warehouses — update a warehouse
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, code, address, active } = body

    if (!id) {
      return NextResponse.json({ error: 'id e obrigatorio.' }, { status: 400 })
    }

    const idx = warehouses.findIndex((w) => w.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Deposito nao encontrado.' }, { status: 404 })
    }

    if (name !== undefined) warehouses[idx].name = name.trim()
    if (code !== undefined) {
      if (warehouses.some((w) => w.code === code.trim() && w.id !== id)) {
        return NextResponse.json({ error: 'Codigo ja existe.' }, { status: 400 })
      }
      warehouses[idx].code = code.trim()
    }
    if (address !== undefined) warehouses[idx].address = address?.trim() || null
    if (active !== undefined) warehouses[idx].active = active

    return NextResponse.json({ data: warehouses[idx] })
  } catch {
    return NextResponse.json(
      { error: 'Erro ao processar.' },
      { status: 500 }
    )
  }
}
