import { NextResponse } from 'next/server'
import { trackShipments, isConfigured } from '@/lib/melhor-envio'
import { salesOrders } from '@/lib/data'

// POST /api/shipping/tracking
// Body: { melhorenvio_ids: string[] }
// Returns tracking info for shipments
export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Melhor Envio não configurado' }, { status: 503 })
  }

  let body: { melhorenvio_ids: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.melhorenvio_ids?.length) {
    return NextResponse.json({ error: 'melhorenvio_ids é obrigatório' }, { status: 400 })
  }

  try {
    const trackingData = await trackShipments(body.melhorenvio_ids)

    // Update in-memory orders with latest tracking status
    for (const [meId, info] of Object.entries(trackingData)) {
      const orderIdx = salesOrders.findIndex((o) => o.melhorenvio_id === meId)
      if (orderIdx !== -1) {
        const order = salesOrders[orderIdx]
        if (info.tracking && info.tracking !== order.shipping_tracking) {
          salesOrders[orderIdx] = {
            ...order,
            shipping_tracking: info.tracking,
            updated_at: new Date().toISOString(),
          }
        }
        if (info.status === 'delivered' && order.status === 'shipped') {
          salesOrders[orderIdx] = {
            ...salesOrders[orderIdx],
            status: 'delivered',
            updated_at: new Date().toISOString(),
          }
        }
      }
    }

    return NextResponse.json({ data: trackingData })
  } catch (err) {
    console.error('Melhor Envio tracking error:', err)
    return NextResponse.json(
      { error: 'Erro ao consultar rastreamento', details: String(err) },
      { status: 502 }
    )
  }
}
