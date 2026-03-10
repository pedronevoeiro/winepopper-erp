'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wine, CheckCircle2 } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && type === 'recovery') {
        const supabase = createClient()
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }).then(({ error }) => {
          if (error) {
            setError('Link de recuperacao expirado ou invalido. Solicite um novo.')
          } else {
            setSessionReady(true)
          }
        })
        return
      }
    }

    const code = searchParams.get('code')
    if (code) {
      const supabase = createClient()
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('Link de recuperacao expirado ou invalido. Solicite um novo.')
        } else {
          setSessionReady(true)
        }
      })
      return
    }

    setError('Link de recuperacao invalido. Solicite um novo.')
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 3000)
      }
    } catch {
      setError('Erro ao atualizar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Wine className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
        <CardDescription>
          {success ? 'Senha atualizada com sucesso!' : 'Digite sua nova senha'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Redirecionando para o login...
            </p>
          </div>
        ) : sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        ) : error ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Voltar ao login
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Verificando link...</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
