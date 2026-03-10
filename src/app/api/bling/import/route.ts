import { NextRequest, NextResponse } from 'next/server'
import { runImport, type ImportModule } from '@/lib/bling-import'

const VALID_MODULES: ImportModule[] = [
  'contacts',
  'products',
  'stock',
  'sales_orders',
  'financial',
  'invoices',
]

// POST /api/bling/import — run import from Bling for a company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company_id, modules } = body as {
      company_id: string
      modules: string[]
    }

    if (!company_id) {
      return NextResponse.json(
        { error: 'Campo obrigatorio: company_id' },
        { status: 400 }
      )
    }

    if (!Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json(
        { error: 'Selecione pelo menos um modulo para importar.' },
        { status: 400 }
      )
    }

    // Validate modules
    const validModules = modules.filter((m) =>
      VALID_MODULES.includes(m as ImportModule)
    ) as ImportModule[]

    if (validModules.length === 0) {
      return NextResponse.json(
        { error: `Modulos invalidos. Validos: ${VALID_MODULES.join(', ')}` },
        { status: 400 }
      )
    }

    const results = await runImport(company_id, validModules)

    return NextResponse.json({ results })
  } catch (err) {
    console.error('POST /api/bling/import error:', err)
    const message = err instanceof Error ? err.message : 'Erro interno do servidor.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
