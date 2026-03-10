import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const path = req.nextUrl.pathname
  const isAuthPage = path.startsWith('/login')
  const isApiAuth = path.startsWith('/api/auth')
  const isAuthCallback = path.startsWith('/auth/callback')
  const isResetPassword = path.startsWith('/reset-password')

  if (isApiAuth || isAuthCallback) return NextResponse.next()
  if (isResetPassword) return NextResponse.next()
  if (isAuthPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    return NextResponse.next()
  }
  if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.nextUrl))
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
