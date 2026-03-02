import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Truck } from 'lucide-react'

export default function EnviosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Envios e Etiquetas"
        description="Geração de etiquetas e rastreamento de envios"
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Truck className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Nenhum envio pendente</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos prontos para envio aparecerão aqui para geração de etiquetas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
