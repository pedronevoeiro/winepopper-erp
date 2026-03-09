import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/audit-log — list audit log entries, optionally filtered by user_id
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id')

    let query = db()
      .from('erp_audit_log')
      .select('*, user:erp_user_profiles(display_name)')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('GET /api/audit-log error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten user display_name for API contract compatibility
    const enriched = (data ?? []).map((entry) => {
      const user = entry.user as { display_name: string } | null
      return {
        ...entry,
        user: undefined,
        user_display_name: user?.display_name ?? null,
      }
    })

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
    })
  } catch (err) {
    console.error('GET /api/audit-log unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
