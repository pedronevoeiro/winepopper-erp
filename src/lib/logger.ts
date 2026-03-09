import { createClient } from '@supabase/supabase-js'

type LogLevel = 'info' | 'warn' | 'error' | 'critical'

const APP_NAME = 'erp'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function logError(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  stackTrace?: string
) {
  // Always console log
  const logFn = level === 'critical' || level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  logFn(`[${APP_NAME}] [${level}]`, message, context ?? '')

  try {
    const supabase = getAdminClient()
    if (!supabase) return

    await supabase.from('app_error_logs').insert({
      app: APP_NAME,
      level,
      message,
      context: context ?? null,
      stack_trace: stackTrace ?? null,
    })

    // Send email alert for critical errors
    if (level === 'critical') {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Alertas Winepopper <alertas@winepopper.com.br>',
            to: 'pedro@winepopper.com.br',
            subject: `[ALERTA ${APP_NAME.toUpperCase()}] ${message}`,
            text: `Erro critico detectado no ${APP_NAME.toUpperCase()}:\n\n${message}\n\nContexto: ${JSON.stringify(context, null, 2)}\n\nStack: ${stackTrace ?? 'N/A'}`,
          }),
        }).catch(() => {}) // Don't let email failure propagate
      }
    }
  } catch (err) {
    console.error('[LOGGER FALLBACK]', { level, message, context, err })
  }
}
