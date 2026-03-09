import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const BLING_AUTHORIZE_URL = 'https://www.bling.com.br/Api/v3/oauth/authorize'

/**
 * GET /api/bling/authorize?company_id=xxx
 * Redirects to Bling OAuth2 authorization page.
 * The company_id is passed as state so we can associate the callback with the right company.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id e obrigatorio.' },
        { status: 400 }
      )
    }

    // Get Bling credentials for this company
    const { data: creds, error } = await db()
      .from('erp_bling_credentials')
      .select('client_id')
      .eq('company_id', companyId)
      .single()

    if (error || !creds) {
      return NextResponse.json(
        { error: 'Credenciais Bling nao encontradas para esta empresa. Cadastre client_id e client_secret primeiro.' },
        { status: 404 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${appUrl}/api/bling/callback`

    const authorizeUrl = new URL(BLING_AUTHORIZE_URL)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('client_id', creds.client_id)
    authorizeUrl.searchParams.set('state', companyId)
    authorizeUrl.searchParams.set('redirect_uri', redirectUri)

    return NextResponse.redirect(authorizeUrl.toString())
  } catch (err) {
    console.error('GET /api/bling/authorize error:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
