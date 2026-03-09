import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/users/[id] — remove a user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = db()

    // Fetch user first to return it in response
    const { data: user, error: fetchErr } = await supabase
      .from('erp_user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !user) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado.' },
        { status: 404 }
      )
    }

    const { error: deleteErr } = await supabase
      .from('erp_user_profiles')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      console.error('DELETE /api/users/[id] error:', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({
      data: user,
      message: 'Usuario removido com sucesso.',
    })
  } catch (err) {
    console.error('DELETE /api/users/[id] unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
