'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDocument } from '@/lib/constants'
import { Plus, Search, Users } from 'lucide-react'
import type { ErpContact } from '@/types/database'

const CONTACT_TYPE_LABELS: Record<string, string> = {
  customer: 'Cliente',
  supplier: 'Fornecedor',
  both: 'Cliente/Fornecedor',
}

const CONTACT_TYPE_COLORS: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800',
  supplier: 'bg-purple-100 text-purple-800',
  both: 'bg-indigo-100 text-indigo-800',
}

export default function ContatosPage() {
  const [contacts, setContacts] = useState<ErpContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/contacts')
      .then((res) => res.json())
      .then((json) => setContacts(Array.isArray(json) ? json : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = contacts

    if (typeFilter !== 'all') {
      result = result.filter((c) => c.type === typeFilter || c.type === 'both')
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.document?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q)
      )
    }

    return result
  }, [contacts, typeFilter, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contatos"
        description="Clientes e fornecedores"
        actions={
          <Link href="/contatos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Contato
            </Button>
          </Link>
        }
      />

      {/* Search + Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, documento, e-mail ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList>
          <TabsTrigger value="all">
            Todos
            {!loading && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({contacts.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="customer">
            Clientes
            {!loading && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({contacts.filter((c) => c.type === 'customer' || c.type === 'both').length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="supplier">
            Fornecedores
            {!loading && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({contacts.filter((c) => c.type === 'supplier' || c.type === 'both').length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Table is shown for all tabs */}
        <div className="mt-4">
          {loading ? (
            <Card>
              <CardContent className="space-y-3 pt-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">Nenhum contato encontrado</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search
                    ? 'Tente ajustar sua busca.'
                    : 'Cadastre clientes e fornecedores para comecar.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNPJ/CPF</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>E-mail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.name}
                          {contact.trade_name && (
                            <span className="block text-xs text-muted-foreground">
                              {contact.trade_name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatDocument(contact.document)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`border-0 font-medium ${CONTACT_TYPE_COLORS[contact.type] ?? ''}`}
                          >
                            {CONTACT_TYPE_LABELS[contact.type] ?? contact.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contact.city && contact.state
                            ? `${contact.city}/${contact.state}`
                            : contact.city || contact.state || '-'}
                        </TableCell>
                        <TableCell>{contact.phone || contact.mobile || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {contact.email || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>
    </div>
  )
}
