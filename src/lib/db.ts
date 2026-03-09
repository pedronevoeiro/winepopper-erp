import { createAdminClient } from '@/lib/supabase/admin'
export function db() { return createAdminClient() }
