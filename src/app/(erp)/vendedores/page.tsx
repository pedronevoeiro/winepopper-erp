'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/constants'
import { UserCheck, Mail, Phone, Percent } from 'lucide-react'

interface Salesperson {
  name: string
  email: string
  phone: string
  commissionRate: number
  totalSales: number
  totalCommission: number
  active: boolean
}

const salespeople: Salesperson[] = [
  {
    name: 'Carlos Mendes',
    email: 'carlos@winepopper.com.br',
    phone: '(11) 99999-0001',
    commissionRate: 5,
    totalSales: 187500,
    totalCommission: 9375,
    active: true,
  },
  {
    name: 'Ana Oliveira',
    email: 'ana@winepopper.com.br',
    phone: '(11) 99999-0002',
    commissionRate: 6,
    totalSales: 225000,
    totalCommission: 13500,
    active: true,
  },
  {
    name: 'Roberto Santos',
    email: 'roberto@winepopper.com.br',
    phone: '(11) 99999-0003',
    commissionRate: 4.5,
    totalSales: 142000,
    totalCommission: 6390,
    active: true,
  },
]

export default function VendedoresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendedores"
        description="Cadastro e gestao de vendedores"
      />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salespeople.filter((s) => s.active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Vendas</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(salespeople.reduce((sum, s) => sum + s.totalSales, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Comissoes</CardTitle>
            <Percent className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatBRL(salespeople.reduce((sum, s) => sum + s.totalCommission, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salesperson cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {salespeople.map((sp) => (
          <Card key={sp.name} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {sp.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-base">{sp.name}</CardTitle>
                    <Badge
                      variant="secondary"
                      className="mt-1 border-0 bg-green-100 text-green-800 font-medium"
                    >
                      {sp.commissionRate}% comissao
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact info */}
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{sp.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{sp.phone}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Vendas</p>
                  <p className="text-sm font-semibold">{formatBRL(sp.totalSales)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comissao Acumulada</p>
                  <p className="text-sm font-semibold text-green-600">
                    {formatBRL(sp.totalCommission)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
