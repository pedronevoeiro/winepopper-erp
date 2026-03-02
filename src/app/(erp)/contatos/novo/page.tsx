'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'

const contactSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  trade_name: z.string().optional(),
  type: z.enum(['customer', 'supplier', 'both']),
  person_type: z.enum(['PJ', 'PF']),
  document: z.string().min(1, 'Documento e obrigatorio'),
  state_reg: z.string().optional(),
  email: z.string().email('E-mail invalido').optional().or(z.literal('')),
  phone: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

export default function NovoContatoPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      type: 'customer',
      person_type: 'PJ',
    },
  })

  async function onSubmit(data: ContactFormData) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        router.push('/contatos')
      } else {
        const json = await res.json()
        setError(json.error || 'Erro ao salvar contato.')
      }
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Contato"
        actions={
          <Link href="/contatos">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Dados Principais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Principais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Nome / Razao Social */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome / Razao Social <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Nome completo ou razao social"
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Nome Fantasia */}
              <div className="space-y-2">
                <Label htmlFor="trade_name">Nome Fantasia</Label>
                <Input
                  id="trade_name"
                  placeholder="Nome fantasia"
                  {...register('trade_name')}
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="type">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <select
                  id="type"
                  {...register('type')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                >
                  <option value="customer">Cliente</option>
                  <option value="supplier">Fornecedor</option>
                  <option value="both">Ambos</option>
                </select>
              </div>

              {/* Pessoa */}
              <div className="space-y-2">
                <Label htmlFor="person_type">
                  Pessoa <span className="text-red-500">*</span>
                </Label>
                <select
                  id="person_type"
                  {...register('person_type')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                >
                  <option value="PJ">Pessoa Juridica (PJ)</option>
                  <option value="PF">Pessoa Fisica (PF)</option>
                </select>
              </div>

              {/* Documento (CNPJ/CPF) */}
              <div className="space-y-2">
                <Label htmlFor="document">
                  CNPJ ou CPF <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="document"
                  placeholder="00.000.000/0000-00"
                  {...register('document')}
                  aria-invalid={!!errors.document}
                />
                {errors.document && (
                  <p className="text-xs text-red-500">{errors.document.message}</p>
                )}
              </div>

              {/* Inscricao Estadual */}
              <div className="space-y-2">
                <Label htmlFor="state_reg">Inscricao Estadual</Label>
                <Input
                  id="state_reg"
                  placeholder="Inscricao estadual"
                  {...register('state_reg')}
                />
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empresa.com.br"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  {...register('phone')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereco */}
        <Card>
          <CardHeader>
            <CardTitle>Endereco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* CEP */}
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  {...register('cep')}
                />
              </div>

              {/* Rua */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  placeholder="Nome da rua"
                  {...register('street')}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {/* Numero */}
              <div className="space-y-2">
                <Label htmlFor="number">Numero</Label>
                <Input
                  id="number"
                  placeholder="123"
                  {...register('number')}
                />
              </div>

              {/* Complemento */}
              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  placeholder="Sala, andar..."
                  {...register('complement')}
                />
              </div>

              {/* Bairro */}
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  placeholder="Bairro"
                  {...register('neighborhood')}
                />
              </div>

              {/* Cidade + UF side by side */}
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Cidade"
                  {...register('city')}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Input
                  id="state"
                  placeholder="SP"
                  maxLength={2}
                  {...register('state')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observacoes */}
        <Card>
          <CardHeader>
            <CardTitle>Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              placeholder="Observacoes sobre o contato..."
              rows={4}
              {...register('notes')}
            />
          </CardContent>
        </Card>

        {/* Botoes */}
        <div className="flex justify-end gap-3">
          <Link href="/contatos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar Contato'}
          </Button>
        </div>
      </form>
    </div>
  )
}
