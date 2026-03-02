import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }).safeParse(credentials)
        if (!parsed.success) return null

        const supabase = createAdminClient()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        })
        if (error || !data.user) return null

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string
        const supabase = createAdminClient()
        const result = await supabase
          .from('erp_user_profiles')
          .select('role, display_name')
          .eq('id', token.id as string)
          .single()
        const profile = result.data as { role: string; display_name: string } | null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).role = profile?.role ?? 'viewer'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).displayName = profile?.display_name ?? session.user.name
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
