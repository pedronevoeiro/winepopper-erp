import { NextRequest, NextResponse } from 'next/server'
import { productionWorkers } from '@/lib/data'
import type { ErpProductionWorker } from '@/types/database'

// GET /api/production-workers — list all production workers
export async function GET() {
  return NextResponse.json({
    data: productionWorkers,
    count: productionWorkers.length,
  })
}

// POST /api/production-workers — create a new production worker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: name' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const newWorker: ErpProductionWorker = {
      id: crypto.randomUUID(),
      name: body.name,
      role: body.role || null,
      phone: body.phone || null,
      active: body.active ?? true,
      created_at: now,
      updated_at: now,
    }

    productionWorkers.push(newWorker)

    return NextResponse.json({ data: newWorker }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisicao invalido.' },
      { status: 400 }
    )
  }
}
