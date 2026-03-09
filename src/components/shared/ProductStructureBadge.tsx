import { Badge } from '@/components/ui/badge'
import { PRODUCT_STRUCTURE_LABELS, PRODUCT_STRUCTURE_COLORS } from '@/lib/constants'
import type { ErpProductStructure } from '@/types/database'

export function ProductStructureBadge({ structure }: { structure: ErpProductStructure }) {
  return (
    <Badge variant="secondary" className={`border-0 font-medium ${PRODUCT_STRUCTURE_COLORS[structure]}`}>
      {PRODUCT_STRUCTURE_LABELS[structure]}
    </Badge>
  )
}
