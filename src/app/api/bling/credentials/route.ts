import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/bling/credentials
 * Lists Bling credentials (without secrets) for all companies.
 */
export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await db()
      .from('erp_bling_credentials')
      .select('id, company_id, client_id, connected, created_at, updated_at')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('GET /api/bling/credentials error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

/**
 * POST /api/bling/credentials
 * Create or update Bling credentials for a company.
 * Body: { company_id, client_id, client_secret }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company_id, client_id, client_secret } = body

    if (!company_id || !client_id || !client_secret) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: company_id, client_id, client_secret' },
        { status: 400 }
      )
    }

    const supabase = db()
    const now = new Date().toISOString()

    // Check if credentials already exist for this company
    const { data: existing } = await supabase
      .from('erp_bling_credentials')
      .select('id')
      .eq('company_id', company_id)
      .single()

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('erp_bling_credentials')
        .update({
          client_id,
          client_secret,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('id, company_id, client_id, connected')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    // Insert new
    const { data, error } = await supabase
      .from('erp_bling_credentials')
      .insert({
        company_id,
        client_id,
        client_secret,
        connected: false,
        created_at: now,
        updated_at: now,
      })
      .select('id, company_id, client_id, connected')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/bling/credentials error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
