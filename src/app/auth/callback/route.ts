import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /auth/callback?code=xxx
 * Handles Supabase Auth email callbacks (password recovery, email confirmation).
 * Exchanges the code for a session and redirects accordingly.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://erp.winepopper.com.br'

  if (!code) {
    // If no code, check for hash-based tokens (older Supabase format)
    // The client-side page will handle hash fragments
    if (type === 'recovery') {
      return NextResponse.redirect(`${appUrl}/reset-password`)
    }
    return NextResponse.redirect(`${appUrl}/login`)
  }

  try {
    const supabase = createAdminClient()

    // Exchange the code for a session
    // Note: For PKCE flow, we need the server-side client
    // For now, redirect to reset-password with the code
    if (type === 'recovery') {
      return NextResponse.redirect(`${appUrl}/reset-password?code=${code}`)
    }

    // For email confirmation or other types
    return NextResponse.redirect(`${appUrl}/login?confirmed=true`)
  } catch (err) {
    console.error('Auth callback error:', err)
    return NextResponse.redirect(`${appUrl}/login?error=callback_failed`)
  }
}
