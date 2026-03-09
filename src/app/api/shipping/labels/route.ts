import { NextResponse } from 'next/server'
import { addToCart, checkout, generateLabels, isConfigured, getProductDimensions } from '@/lib/melhor-envio'
import { db } from '@/lib/db'
import type { AddToCartParams } from '@/lib/melhor-envio'

// POST /api/shipping/labels
// Body: { order_ids: string[], service_id: number }
// Creates shipments, purchases labels, and generates them
export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Melhor Envio não configurado (MELHORENVIO_TOKEN)' }, { status: 503 })
  }

  let body: { order_ids: string[]; service_id?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.order_ids?.length) {
    return NextResponse.json({ error: 'order_ids é obrigatório' }, { status: 400 })
  }

  try {
    const supabase = db()
    const results: Array<{ order_id: string; melhorenvio_id: string | null; tracking: string | null; error: string | null }> = []

    for (const orderId of body.order_ids) {
      // Fetch order
      const { data: order } = await supabase
        .from('erp_sales_orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (!order) {
        results.push({ order_id: orderId, melhorenvio_id: null, tracking: null, error: 'Pedido não encontrado' })
        continue
      }

      if (order.status !== 'ready' && order.status !== 'approved') {
        results.push({ order_id: orderId, melhorenvio_id: null, tracking: null, error: `Status inválido: ${order.status}` })
        continue
      }

      if (order.melhorenvio_id) {
        results.push({ order_id: orderId, melhorenvio_id: order.melhorenvio_id, tracking: order.shipping_tracking, error: 'Etiqueta já gerada' })
        continue
      }

      // Fetch contact
      const { data: contact } = await supabase
        .from('erp_contacts')
        .select('*')
        .eq('id', order.contact_id)
        .single()

      // Fetch company
      const { data: company } = await supabase
        .from('erp_companies')
        .select('*')
        .eq('id', order.company_id)
        .single()

      const shippingAddr = (order.shipping_address ?? {}) as Record<string, string>

      if (!contact) {
        results.push({ order_id: orderId, melhorenvio_id: null, tracking: null, error: 'Contato não encontrado' })
        continue
      }

      const toCep = shippingAddr.cep || contact.cep
      if (!toCep) {
        results.push({ order_id: orderId, melhorenvio_id: null, tracking: null, error: 'CEP de destino não informado' })
        continue
      }

      try {
        const dim = getProductDimensions()
        const totalWeight = dim.weight * 50 // estimate

        const cartParams: AddToCartParams = {
          service_id: body.service_id || 1,
          from: {
            name: company?.trade_name || company?.name || 'Winepopper',
            phone: company?.phone || '19999999999',
            email: company?.email || 'comercial@winepopper.com.br',
            document: company?.document || '00000000000000',
            address: company?.street || 'Rua Exemplo',
            number: company?.number || '100',
            district: company?.neighborhood || 'Centro',
            city: company?.city || 'Rio Claro',
            state_abbr: company?.state || 'SP',
            postal_code: process.env.MELHORENVIO_CEP_ORIGEM || '13501060',
          },
          to: {
            name: contact.name,
            phone: contact.phone || contact.mobile || '',
            email: contact.email || undefined,
            document: contact.document || '',
            address: shippingAddr.street || contact.street || '',
            complement: shippingAddr.complement || contact.complement || undefined,
            number: shippingAddr.number || contact.number || '',
            district: shippingAddr.neighborhood || contact.neighborhood || '',
            city: shippingAddr.city || contact.city || '',
            state_abbr: shippingAddr.state || contact.state || '',
            postal_code: toCep.replace(/\D/g, ''),
          },
          products: [
            {
              name: `Pedido #${order.order_number}`,
              quantity: 1,
              unitary_value: order.total,
            },
          ],
          volumes: [
            {
              height: 22,
              width: 30,
              length: 30,
              weight: totalWeight,
            },
          ],
          options: {
            insurance_value: order.total,
            receipt: false,
            own_hand: false,
          },
        }

        // 1. Add to cart
        const cartItem = await addToCart(cartParams)

        // 2. Checkout (purchase)
        await checkout([cartItem.id])

        // 3. Generate label
        const labels = await generateLabels([cartItem.id])
        const label = labels[cartItem.id]

        // Update order in database
        await supabase
          .from('erp_sales_orders')
          .update({
            melhorenvio_id: cartItem.id,
            shipping_tracking: label?.tracking || null,
            status: 'shipped',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)

        results.push({
          order_id: orderId,
          melhorenvio_id: cartItem.id,
          tracking: label?.tracking || null,
          error: null,
        })
      } catch (err) {
        results.push({ order_id: orderId, melhorenvio_id: null, tracking: null, error: String(err) })
      }
    }

    const success = results.filter((r) => !r.error).length
    const failed = results.filter((r) => r.error).length

    return NextResponse.json({ success, failed, results })
  } catch (err) {
    console.error('POST /api/shipping/labels unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
