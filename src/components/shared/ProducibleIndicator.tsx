import { cn } from '@/lib/utils'

export function ProducibleIndicator({ quantity }: { quantity: number }) {
  return (
    <span className={cn('text-xs font-medium', quantity > 0 ? 'text-green-600' : 'text-muted-foreground')}>
      {quantity > 0 ? `Produzir: ${quantity} un.` : 'Sem insumos'}
    </span>
  )
}
