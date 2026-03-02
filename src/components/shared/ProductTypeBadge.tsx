import { Badge } from '@/components/ui/badge'
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS } from '@/lib/constants'
import type { ErpProductType } from '@/types/database'

export function ProductTypeBadge({ type }: { type: ErpProductType }) {
  return (
    <Badge variant="secondary" className={`border-0 font-medium ${PRODUCT_TYPE_COLORS[type]}`}>
      {PRODUCT_TYPE_LABELS[type]}
    </Badge>
  )
}
