import { NextResponse } from 'next/server'

// GET /api/shipping/quote?cep=XXXXX
// Returns mock shipping options (simulates Melhor Envio API)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cep = searchParams.get('cep')

  if (!cep) {
    return NextResponse.json({ error: 'CEP obrigatorio' }, { status: 400 })
  }

  // Mock delay to simulate API call
  await new Promise((r) => setTimeout(r, 500))

  // Generate mock options based on CEP region
  const cleanCep = cep.replace(/\D/g, '')
  const isLocal = cleanCep.startsWith('13') // Campinas region
  const isSP = cleanCep.startsWith('0') || cleanCep.startsWith('1')

  const basePrice = isLocal ? 25 : isSP ? 45 : 85

  return NextResponse.json({
    data: [
      {
        carrier: 'Correios',
        method: 'PAC',
        price: basePrice,
        days: isLocal ? 3 : isSP ? 5 : 8,
        logo: null,
      },
      {
        carrier: 'Correios',
        method: 'SEDEX',
        price: Math.round(basePrice * 1.8 * 100) / 100,
        days: isLocal ? 1 : isSP ? 2 : 3,
        logo: null,
      },
      {
        carrier: 'Jadlog',
        method: '.Package',
        price: Math.round(basePrice * 1.1 * 100) / 100,
        days: isLocal ? 2 : isSP ? 4 : 6,
        logo: null,
      },
      {
        carrier: 'Total Express',
        method: 'Normal',
        price: Math.round(basePrice * 1.3 * 100) / 100,
        days: isLocal ? 2 : isSP ? 3 : 5,
        logo: null,
      },
    ],
  })
}
