'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatBRL, formatDate } from '@/lib/constants'
import { Plus, PackagePlus } from 'lucide-react'
import type { ErpPurchaseEntry } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EntryWithMeta extends ErpPurchaseEntry {
  supplier_name: string
  item_count: number
}

// ---------------------------------------------------------------------------
// Status labels and colors
// ---------------------------------------------------------------------------
const ENTRY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  received: 'Recebido',
  cancelled: 'Cancelado',
}

const ENTRY_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function EntradasPage() {
  const [entries, setEntries] = useState<EntryWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/entries')
      .then((res) => res.json())
      .then((json) => {
        const data = json.data ?? json
        setEntries(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entrada de Produtos"
        description="Notas de entrada e recebimento de mercadorias"
        actions={
          <Link href="/entradas/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Entrada
            </Button>
          </Link>
        }
      />

      {/* Loading skeleton */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <PackagePlus className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhuma entrada registrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre notas de entrada para dar entrada de produtos no estoque.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entries.length - index}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.invoice_number || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.supplier_name}
                    </TableCell>
                    <TableCell>
                      {formatDate(entry.entry_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(entry.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.item_count}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`border-0 font-medium ${ENTRY_STATUS_COLORS[entry.status] ?? ''}`}
                      >
                        {ENTRY_STATUS_LABELS[entry.status] ?? entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
