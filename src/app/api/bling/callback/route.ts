import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/bling-nfe'

/**
 * GET /api/bling/callback?code=xxx&state=COMPANY_ID
 * Receives the OAuth2 callback from Bling, exchanges code for tokens,
 * stores them in the database, and redirects back to settings.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const companyId = searchParams.get('state')

    if (!code || !companyId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        `${appUrl}/configuracoes?bling=error&msg=Parametros+ausentes`
      )
    }

    await exchangeCode(companyId, code)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${appUrl}/configuracoes?bling=success&company_id=${companyId}`
    )
  } catch (err) {
    console.error('GET /api/bling/callback error:', err)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const message = err instanceof Error ? encodeURIComponent(err.message) : 'Erro+desconhecido'
    return NextResponse.redirect(
      `${appUrl}/configuracoes?bling=error&msg=${message}`
    )
  }
}
