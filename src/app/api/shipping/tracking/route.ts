import { NextResponse } from 'next/server'
import { trackShipments, isConfigured } from '@/lib/melhor-envio'
import { db } from '@/lib/db'

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
    const supabase = db()
    const trackingData = await trackShipments(body.melhorenvio_ids)

    // Update orders with latest tracking status
    for (const [meId, info] of Object.entries(trackingData)) {
      // Fetch the order by melhorenvio_id
      const { data: order } = await supabase
        .from('erp_sales_orders')
        .select('id, status, shipping_tracking')
        .eq('melhorenvio_id', meId)
        .single()

      if (order) {
        const updatePayload: Record<string, unknown> = {}

        if (info.tracking && info.tracking !== order.shipping_tracking) {
          updatePayload.shipping_tracking = info.tracking
          updatePayload.updated_at = new Date().toISOString()
        }

        if (info.status === 'delivered' && order.status === 'shipped') {
          updatePayload.status = 'delivered'
          updatePayload.updated_at = new Date().toISOString()
        }

        if (Object.keys(updatePayload).length > 0) {
          await supabase
            .from('erp_sales_orders')
            .update(updatePayload)
            .eq('id', order.id)
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
