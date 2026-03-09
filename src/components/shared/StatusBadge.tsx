import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  FINANCIAL_STATUS_LABELS,
  FINANCIAL_STATUS_COLORS,
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_STATUS_COLORS,
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_COLORS,
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_COLORS,
} from '@/lib/constants'

type StatusType = 'order' | 'financial' | 'production' | 'commission' | 'purchase_order'

interface StatusBadgeProps {
  status: string
  type: StatusType
  className?: string
}

const labelsMap: Record<StatusType, Record<string, string>> = {
  order: ORDER_STATUS_LABELS,
  financial: FINANCIAL_STATUS_LABELS,
  production: PRODUCTION_STATUS_LABELS,
  commission: COMMISSION_STATUS_LABELS,
  purchase_order: PURCHASE_ORDER_STATUS_LABELS,
}

const colorsMap: Record<StatusType, Record<string, string>> = {
  order: ORDER_STATUS_COLORS,
  financial: FINANCIAL_STATUS_COLORS,
  production: PRODUCTION_STATUS_COLORS,
  commission: COMMISSION_STATUS_COLORS,
  purchase_order: PURCHASE_ORDER_STATUS_COLORS,
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const labels = labelsMap[type]
  const colors = colorsMap[type]

  const label = labels[status] ?? status
  const colorClasses = colors[status] ?? 'bg-gray-100 text-gray-700'

  return (
    <Badge
      variant="secondary"
      className={cn(
        'border-0 font-medium',
        colorClasses,
        className
      )}
    >
      {label}
    </Badge>
  )
}
