import { NextRequest, NextResponse } from 'next/server'
import { getBlingStatusAllCompanies } from '@/lib/bling-nfe'

/**
 * GET /api/bling/status
 * Returns Bling connection status for all companies.
 */
export async function GET(_request: NextRequest) {
  try {
    const statuses = await getBlingStatusAllCompanies()
    return NextResponse.json({ data: statuses })
  } catch (err) {
    console.error('GET /api/bling/status error:', err)
    return NextResponse.json(
      { error: 'Erro ao verificar status do Bling.' },
      { status: 500 }
    )
  }
}
