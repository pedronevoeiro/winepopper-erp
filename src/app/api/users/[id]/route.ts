import { NextRequest, NextResponse } from 'next/server'
import { users } from '@/lib/data'

// DELETE /api/users/[id] — remove a user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const userIndex = users.findIndex((u) => u.id === id)
  if (userIndex === -1) {
    return NextResponse.json(
      { error: 'Usuario nao encontrado.' },
      { status: 404 }
    )
  }

  const removed = users.splice(userIndex, 1)[0]

  return NextResponse.json({
    data: removed,
    message: 'Usuario removido com sucesso.',
  })
}
