// Story 12.5a — Edge Function : health-check-cron
// Vérifie la santé des services internes et externes.
// Planifiée toutes les 5 min via pg_cron ou Supabase Cron Jobs.
// Peut aussi être invoquée manuellement via le bouton "Rafraîchir" du Hub.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  evaluateServiceStatus,
  buildHealthCheckResult,
  reconcileIncidents,
  type ServiceCheck,
  type IncidentMap,
} from './health-check-logic.ts'

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
  // URL surchargeable via env (sandbox ↔ prod), aligné sur le module facturation.
  const base = Deno.env.get('PENNYLANE_API_URL') ?? 'https://app.pennylane.com/api/external/v2'
  const { ok, latencyMs } = await timedFetch(`${base}/me`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
    },
  })
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

// Sonde une app Vercel : un simple GET sur la home. Une redirection vers /login (307)
// ou une page (200/401) prouve que l'app répond. Seul un 5xx / timeout = en panne.
// URL surchargeable via env (MONITOR_HUB_URL / MONITOR_CLIENT_URL) pour basculer
// vers les domaines custom (hub/app.monprojet-pro.com) le jour où ils seront actifs.
async function checkVercelApp(serviceName: string, url: string): Promise<ServiceCheck> {
  const { ok, latencyMs } = await timedFetch(url, { redirect: 'manual' }, 10000)
  return {
    status: evaluateServiceStatus(serviceName, latencyMs, !ok),
    latencyMs,
  }
}

async function checkResend(apiKey: string | undefined): Promise<ServiceCheck> {
  if (!apiKey) {
    return { status: 'ok', latencyMs: 0, error: 'RESEND_API_KEY not configured — skipped' }
  }
  // GET /domains : lecture seule (aucun email envoyé), valide la clé + l'API Resend.
  const { ok, latencyMs } = await timedFetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  })
  return {
    status: evaluateServiceStatus('resend', latencyMs, !ok),
    latencyMs,
  }
}

// ── Notification MiKL ─────────────────────────────────────────────────────────

// Crée l'alerte cloche pour un service en panne durable.
// Retourne l'id de la notification créée (pour pouvoir la refermer ensuite), ou
// null en cas d'échec.
async function sendAlertNotification(
  supabase: ReturnType<typeof createClient>,
  operatorAuthId: string,
  serviceName: string,
  serviceStatus: string
): Promise<string | null> {
  const displayName = serviceName.replace(/_/g, ' ')

  // service_role → RLS bypass, .select() après insert est sûr ici
  const { data: notif, error: notifError } = await supabase
    .from('notifications')
    .insert({
      recipient_type: 'operator',
      recipient_id: operatorAuthId,
      type: 'system',
      title: `Alerte système — ${displayName}`,
      body: `Le service ${displayName} est en panne depuis plus de 15 min (statut: ${serviceStatus}). Cette alerte disparaîtra automatiquement au rétablissement du service.`,
      link: '/modules/admin/system',
    })
    .select('id')
    .single()

  if (notifError) {
    console.error('[HEALTH:CRON] Failed to insert notification:', notifError)
    return null
  }

  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'system',
    actor_id: operatorAuthId,
    action: 'system_alert',
    entity_type: 'system',
    entity_id: null,
    metadata: { service: serviceName, status: serviceStatus },
  })

  if (logError) {
    console.error('[HEALTH:CRON] Failed to insert activity log:', logError)
  }

  return (notif as { id: string } | null)?.id ?? null
}

// Auto-résolution : supprime l'alerte cloche d'un service revenu à la normale.
// L'historique reste tracé dans activity_logs (action `system_alert_resolved`).
async function resolveAlertNotification(
  supabase: ReturnType<typeof createClient>,
  operatorAuthId: string,
  serviceName: string,
  notificationId: string
): Promise<void> {
  const { error: delError } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (delError) {
    console.error('[HEALTH:CRON] Failed to delete resolved notification:', delError)
    return
  }

  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'system',
    actor_id: operatorAuthId,
    action: 'system_alert_resolved',
    entity_type: 'system',
    entity_id: null,
    metadata: { service: serviceName },
  })

  if (logError) {
    console.error('[HEALTH:CRON] Failed to insert resolution log:', logError)
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const pennylaneToken = Deno.env.get('PENNYLANE_API_TOKEN')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const hubUrl = Deno.env.get('MONITOR_HUB_URL') ?? 'https://monprojetpro-hub.vercel.app'
  const clientUrl = Deno.env.get('MONITOR_CLIENT_URL') ?? 'https://monprojetpro-client.vercel.app'

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Exécuter tous les checks en parallèle
  const [db, storage, auth, realtime, pennylane, calCom, vercelHub, vercelClient, resend] =
    await Promise.all([
      checkSupabaseDb(supabaseUrl, serviceKey),
      checkSupabaseStorage(supabaseUrl, serviceKey),
      checkSupabaseAuth(supabaseUrl, serviceKey),
      checkSupabaseRealtime(supabaseUrl, serviceKey),
      checkPennylane(pennylaneToken),
      checkCalCom(),
      checkVercelApp('vercel_hub', hubUrl),
      checkVercelApp('vercel_client', clientUrl),
      checkResend(resendKey),
    ])

  const services: Record<string, ServiceCheck> = {
    supabase_db: db,
    supabase_storage: storage,
    supabase_auth: auth,
    supabase_realtime: realtime,
    vercel_hub: vercelHub,
    vercel_client: vercelClient,
    resend,
    pennylane,
    cal_com: calCom,
  }

  const result = buildHealthCheckResult(services)

  // 2. UPSERT le snapshot courant (lu par l'onglet Maintenance & Système)
  const { error: upsertError } = await supabase
    .from('system_config')
    .update({ value: result })
    .eq('key', 'health_checks')

  if (upsertError) {
    console.error('[HEALTH:CRON] Failed to upsert health_checks', upsertError)
    return new Response('Error saving health checks', { status: 500 })
  }

  // 3. Réconciliation d'incidents : alerter les pannes durables (≥15 min),
  //    refermer les alertes des services rétablis (auto-résolution).
  const { data: incidentRow } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'health_incidents')
    .maybeSingle()

  const prevIncidents = (incidentRow?.value ?? {}) as IncidentMap
  const nowMs = Date.now()
  const { toAlert, toResolve, nextIncidents } = reconcileIncidents(
    services,
    prevIncidents,
    nowMs
  )

  if (toAlert.length > 0 || toResolve.length > 0) {
    // Un seul lookup opérateur pour alertes + résolutions
    const { data: operator } = await supabase
      .from('operators')
      .select('auth_user_id')
      .limit(1)
      .maybeSingle()

    const operatorAuthId = (operator as { auth_user_id: string } | null)?.auth_user_id

    if (!operatorAuthId) {
      console.error('[HEALTH:CRON] No operator found — skipping notifications')
    } else {
      // Nouvelles alertes : on renseigne le notificationId dans l'état persisté
      for (const service of toAlert) {
        const notifId = await sendAlertNotification(
          supabase,
          operatorAuthId,
          service,
          services[service].status
        )
        if (notifId && nextIncidents[service]) {
          nextIncidents[service].notificationId = notifId
        }
      }

      // Auto-résolution des services rétablis
      for (const { service, notificationId } of toResolve) {
        await resolveAlertNotification(supabase, operatorAuthId, service, notificationId)
      }
    }
  }

  // Persister l'état d'incidents pour le prochain cycle
  const { error: incidentUpsertError } = await supabase
    .from('system_config')
    .upsert({ key: 'health_incidents', value: nextIncidents })

  if (incidentUpsertError) {
    console.error('[HEALTH:CRON] Failed to upsert health_incidents', incidentUpsertError)
  }

  console.info(
    `[HEALTH:CRON] Global: ${result.globalStatus}, Alerting: ${toAlert.join(', ') || 'none'}, Resolved: ${toResolve.map((r) => r.service).join(', ') || 'none'}`
  )

  return new Response(
    JSON.stringify({ globalStatus: result.globalStatus, checkedAt: result.checkedAt }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
