import { NextResponse } from 'next/server'
import { printLabels, isConfigured } from '@/lib/melhor-envio'

// POST /api/shipping/labels/print
// Body: { melhorenvio_ids: string[] }
// Returns PDF URL for batch label printing
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
    const result = await printLabels(body.melhorenvio_ids)
    return NextResponse.json({ url: result.url })
  } catch (err) {
    console.error('Melhor Envio print error:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar PDF de etiquetas', details: String(err) },
      { status: 502 }
    )
  }
}
