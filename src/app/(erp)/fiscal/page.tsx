import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function FiscalPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiscal / NF-e"
        description="Emissão e gestão de notas fiscais eletrônicas"
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Nenhuma nota fiscal emitida</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Notas fiscais podem ser emitidas a partir de pedidos aprovados.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
