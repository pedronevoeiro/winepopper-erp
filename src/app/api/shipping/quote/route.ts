import { NextResponse } from 'next/server'
import { calculateShipping, isConfigured } from '@/lib/melhor-envio'

// GET /api/shipping/quote?cep=XXXXX&quantity=50&product=classico
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cep = searchParams.get('cep')
  const quantity = parseInt(searchParams.get('quantity') ?? '50', 10)
  const product = searchParams.get('product') ?? undefined

  if (!cep) {
    return NextResponse.json({ error: 'CEP obrigatório' }, { status: 400 })
  }

  // If Melhor Envio is not configured, return mock data
  if (!isConfigured()) {
    const cleanCep = cep.replace(/\D/g, '')
    const isLocal = cleanCep.startsWith('13')
    const isSP = cleanCep.startsWith('0') || cleanCep.startsWith('1')
    const basePrice = isLocal ? 25 : isSP ? 45 : 85

    return NextResponse.json({
      mock: true,
      data: [
        { carrier: 'Correios', method: 'PAC', price: basePrice, days: isLocal ? 3 : isSP ? 5 : 8, service_id: null },
        { carrier: 'Correios', method: 'SEDEX', price: Math.round(basePrice * 1.8 * 100) / 100, days: isLocal ? 1 : isSP ? 2 : 3, service_id: null },
        { carrier: 'Jadlog', method: '.Package', price: Math.round(basePrice * 1.1 * 100) / 100, days: isLocal ? 2 : isSP ? 4 : 6, service_id: null },
      ],
    })
  }

  try {
    const quotes = await calculateShipping({ to_cep: cep, quantity, product_id: product })

    return NextResponse.json({
      mock: false,
      data: quotes.map((q) => ({
        carrier: q.company.name,
        method: q.name,
        price: parseFloat(q.price),
        days: q.delivery_time,
        delivery_range: q.delivery_range,
        service_id: q.id,
        logo: q.company.picture,
      })),
    })
  } catch (err) {
    console.error('Melhor Envio quote error:', err)
    return NextResponse.json(
      { error: 'Erro ao consultar frete', details: String(err) },
      { status: 502 }
    )
  }
}
