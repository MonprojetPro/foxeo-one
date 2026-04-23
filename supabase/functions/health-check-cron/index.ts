// Story 12.5a — Edge Function : health-check-cron
// Vérifie la santé des services internes et externes.
// Planifiée toutes les 5 min via pg_cron ou Supabase Cron Jobs.
// Peut aussi être invoquée manuellement via le bouton "Rafraîchir" du Hub.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  evaluateServiceStatus,
  buildHealthCheckResult,
  shouldSendAlert,
  getAlertingServices,
  type ServiceCheck,
} from './health-check-logic.ts'

// ── Types locaux ──────────────────────────────────────────────────────────────

interface SystemAlertData {
  last_alert_pennylane_at?: string | null
  last_alert_cal_com_at?: string | null
  last_alert_supabase_db_at?: string | null
  last_alert_supabase_storage_at?: string | null
  last_alert_supabase_auth_at?: string | null
  last_alert_supabase_realtime_at?: string | null
}

// ── Helpers de timing ─────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 5000

async function timedFetch(
  url: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const resp = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return { ok: resp.status < 500, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

// ── Checks services internes ──────────────────────────────────────────────────

async function checkSupabaseDb(
  supabaseUrl: string,
  serviceKey: string
): Promise<ServiceCheck> {
  // SELECT from system_config WHERE key='health_checks' — real DB round-trip
  const { ok, latencyMs } = await timedFetch(
    `${supabaseUrl}/rest/v1/system_config?key=eq.health_checks&select=key&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
    }
  )
  return {
    status: evaluateServiceStatus('supabase_db', latencyMs, !ok),
    latencyMs,
  }
}

async function checkSupabaseStorage(
  supabaseUrl: string,
  serviceKey: string
): Promise<ServiceCheck> {
  const { ok, latencyMs } = await timedFetch(`${supabaseUrl}/storage/v1/bucket`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  return {
    status: evaluateServiceStatus('supabase_storage', latencyMs, !ok),
    latencyMs,
  }
}

async function checkSupabaseAuth(
  supabaseUrl: string,
  serviceKey: string
): Promise<ServiceCheck> {
  const { ok, latencyMs } = await timedFetch(`${supabaseUrl}/auth/v1/health`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  return {
    status: evaluateServiceStatus('supabase_auth', latencyMs, !ok),
    latencyMs,
  }
}

async function checkSupabaseRealtime(
  supabaseUrl: string,
  serviceKey: string
): Promise<ServiceCheck> {
  const { ok, latencyMs } = await timedFetch(`${supabaseUrl}/realtime/v1/channels`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  return {
    status: evaluateServiceStatus('supabase_realtime', latencyMs, !ok),
    latencyMs,
  }
}

// ── Checks services externes ──────────────────────────────────────────────────

async function checkPennylane(apiToken: string | undefined): Promise<ServiceCheck> {
  if (!apiToken) {
    // Service non configuré en dev — skip gracieusement
    return { status: 'ok', latencyMs: 0, error: 'PENNYLANE_API_TOKEN not configured — skipped' }
  }
  const { ok, latencyMs } = await timedFetch(
    'https://app.pennylane.com/api/external/v2/me',
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json',
      },
    }
  )
  return {
    status: evaluateServiceStatus('pennylane', latencyMs, !ok),
    latencyMs,
  }
}

async function checkCalCom(): Promise<ServiceCheck> {
  const calUrl = Deno.env.get('CALCOM_BASE_URL') ?? 'https://cal.com'
  const { ok, latencyMs } = await timedFetch(`${calUrl}/api/health`)
  return {
    status: evaluateServiceStatus('cal_com', latencyMs, !ok),
    latencyMs,
  }
}

// ── Notification MiKL ─────────────────────────────────────────────────────────

async function sendAlertNotification(
  supabase: ReturnType<typeof createClient>,
  serviceName: string,
  serviceStatus: string
): Promise<void> {
  // Récupérer l'auth_user_id du premier opérateur
  const { data: operator } = await supabase
    .from('operators')
    .select('auth_user_id')
    .limit(1)
    .maybeSingle()

  if (!operator?.auth_user_id) {
    console.error('[HEALTH:CRON] No operator found for alert notification')
    return
  }

  const displayName = serviceName.replace(/_/g, ' ')

  const { error: notifError } = await supabase.from('notifications').insert({
    recipient_type: 'operator',
    recipient_id: operator.auth_user_id,
    type: 'system',
    title: `Alerte système — ${displayName}`,
    body: `Le service ${displayName} ne répond pas correctement (statut: ${serviceStatus}). Vérifiez le tableau de monitoring.`,
    link: '/modules/admin',
  })

  if (notifError) {
    console.error('[HEALTH:CRON] Failed to insert notification:', notifError)
  }

  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'system',
    actor_id: operator.auth_user_id,
    action: 'system_alert',
    entity_type: 'system',
    entity_id: null,
    metadata: { service: serviceName, status: serviceStatus },
  })

  if (logError) {
    console.error('[HEALTH:CRON] Failed to insert activity log:', logError)
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const pennylaneToken = Deno.env.get('PENNYLANE_API_TOKEN')

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Exécuter tous les checks en parallèle
  const [db, storage, auth, realtime, pennylane, calCom] = await Promise.all([
    checkSupabaseDb(supabaseUrl, serviceKey),
    checkSupabaseStorage(supabaseUrl, serviceKey),
    checkSupabaseAuth(supabaseUrl, serviceKey),
    checkSupabaseRealtime(supabaseUrl, serviceKey),
    checkPennylane(pennylaneToken),
    checkCalCom(),
  ])

  const services: Record<string, ServiceCheck> = {
    supabase_db: db,
    supabase_storage: storage,
    supabase_auth: auth,
    supabase_realtime: realtime,
    pennylane,
    cal_com: calCom,
  }

  const result = buildHealthCheckResult(services)

  // 2. UPSERT dans system_config.health_checks
  const { error: upsertError } = await supabase
    .from('system_config')
    .update({ value: result })
    .eq('key', 'health_checks')

  if (upsertError) {
    console.error('[HEALTH:CRON] Failed to upsert health_checks', upsertError)
    return new Response('Error saving health checks', { status: 500 })
  }

  // 3. Alertes avec debounce
  const alertingServices = getAlertingServices(services)

  if (alertingServices.length > 0) {
    // Lire les données de debounce depuis system_config
    const { data: alertData } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'health_alert_debounce')
      .maybeSingle()

    const debounceData: SystemAlertData = (alertData?.value ?? {}) as SystemAlertData
    const nowMs = Date.now()
    const updatedDebounce: SystemAlertData = { ...debounceData }
    let alertsSent = 0

    for (const serviceName of alertingServices) {
      const debounceKey = `last_alert_${serviceName}_at` as keyof SystemAlertData
      const lastAlertAt = debounceData[debounceKey] ?? null

      if (shouldSendAlert(lastAlertAt, nowMs)) {
        await sendAlertNotification(supabase, serviceName, services[serviceName].status)
        updatedDebounce[debounceKey] = new Date(nowMs).toISOString()
        alertsSent++
      }
    }

    if (alertsSent > 0) {
      // UPSERT debounce data
      await supabase
        .from('system_config')
        .upsert({ key: 'health_alert_debounce', value: updatedDebounce })
    }
  }

  console.info(
    `[HEALTH:CRON] Global: ${result.globalStatus}, Alerting services: ${alertingServices.join(', ') || 'none'}`
  )

  return new Response(
    JSON.stringify({ globalStatus: result.globalStatus, checkedAt: result.checkedAt }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
