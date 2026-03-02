import { NextRequest, NextResponse } from 'next/server'
import { auditLog, users } from '@/lib/data'

// GET /api/audit-log — list audit log entries, optionally filtered by user_id
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')

  let entries = [...auditLog]

  // Filter by user_id if provided
  if (userId) {
    entries = entries.filter((e) => e.user_id === userId)
  }

  // Sort by created_at descending (newest first)
  entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Enrich with user display_name
  const enriched = entries.map((entry) => {
    const user = entry.user_id ? users.find((u) => u.id === entry.user_id) : null
    return {
      ...entry,
      user_display_name: user?.display_name ?? null,
    }
  })

  return NextResponse.json({
    data: enriched,
    count: enriched.length,
  })
}
