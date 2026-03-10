// Story 12.7 — Task 2: Edge Function cron — monitoring instances One
// Planifié quotidiennement à 6h00 via pg_cron ou Supabase Cron Jobs.
// Pour chaque instance active : fetch métriques, stockage, évaluation seuils, notifications.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  computeAlertLevel,
  isLevelEscalation,
  buildAlertTitle,
  type UsageMetrics,
  type AlertLevel,
} from './instances-monitor-logic.ts'

// ── Types locaux ──────────────────────────────────────────────────────────────

interface ClientInstance {
  id: string
  client_id: string
  slug: string
  instance_url: string
  instance_secret: string | null
  status: string
  alert_level: string | null
  usage_metrics: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

export { computeAlertLevel, isLevelEscalation, type AlertLevel, type UsageMetrics }

// ── Fetch métriques depuis l'instance ─────────────────────────────────────────

export async function fetchInstanceMetrics(
  instanceUrl: string,
  instanceSecret: string
): Promise<UsageMetrics | null> {
  try {
    const response = await fetch(`${instanceUrl}/api/hub/health`, {
      method: 'GET',
      headers: { 'X-Hub-Secret': instanceSecret },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      console.error(`[MONITOR:CRON] Health check failed for ${instanceUrl}: ${response.status}`)
      return null
    }

    const data = await response.json() as UsageMetrics
    return data
  } catch (err) {
    console.error(`[MONITOR:CRON] Fetch error for ${instanceUrl}:`, err)
    return null
  }
}

// ── Envoyer notification si escalade ──────────────────────────────────────────

async function sendAlertNotification(
  supabase: SupabaseClient,
  instance: ClientInstance,
  newLevel: AlertLevel,
  operatorId: string
): Promise<void> {
  const title = buildAlertTitle(instance.slug, newLevel)
  const levelLabels: Record<AlertLevel, string> = {
    none: 'normal',
    info: 'information',
    warning: 'avertissement',
    critical: 'critique',
  }
  const body = `Les ressources de l'instance ${instance.slug} ont atteint le seuil ${levelLabels[newLevel]}. Vérifiez le tableau de bord des instances.`
  const link = '/hub/admin#instances'

  // Notification in-app (toujours)
  const notifInsert: Record<string, unknown> = {
    recipient_type: 'operator',
    recipient_id: operatorId,
    type: 'system',
    title,
    body,
    link,
  }

  const { error: notifError } = await supabase.from('notifications').insert(notifInsert)
  if (notifError) {
    console.error('[MONITOR:CRON] Notification insert error:', notifError)
  }

  // Email si warning ou critical
  if (newLevel === 'warning' || newLevel === 'critical') {
    await supabase.functions.invoke('send-email', {
      body: {
        to: Deno.env.get('OPERATOR_EMAIL') ?? 'mikl@foxeo.io',
        subject: title,
        html: `<p>${body}</p><p><a href="${Deno.env.get('HUB_URL') ?? 'https://hub.foxeo.io'}${link}">Voir le tableau de bord</a></p>`,
      },
    })
  }
}

// ── Traitement d'une instance ──────────────────────────────────────────────────

async function processInstance(
  supabase: SupabaseClient,
  instance: ClientInstance,
  operatorId: string
): Promise<void> {
  if (!instance.instance_secret) {
    console.warn(`[MONITOR:CRON] No instance_secret for ${instance.slug}, skipping`)
    return
  }

  const metrics = await fetchInstanceMetrics(instance.instance_url, instance.instance_secret)
  if (!metrics) return

  const previousLevel = (instance.alert_level ?? 'none') as AlertLevel
  const newLevel = computeAlertLevel(metrics)

  // Mettre à jour l'historique (30 derniers snapshots)
  const metadata = (instance.metadata ?? {}) as Record<string, unknown>
  const history = (metadata.usage_metrics_history as UsageMetrics[] | undefined) ?? []
  const updatedHistory = [...history, { ...metrics, timestamp: new Date().toISOString() }].slice(-30)

  // Sauvegarder métriques + alert_level + last_health_check
  const { error: updateError } = await supabase
    .from('client_instances')
    .update({
      usage_metrics: metrics,
      alert_level: newLevel,
      last_health_check: new Date().toISOString(),
      metadata: { ...metadata, usage_metrics_history: updatedHistory },
    })
    .eq('id', instance.id)

  if (updateError) {
    console.error(`[MONITOR:CRON] Update error for ${instance.slug}:`, updateError)
    return
  }

  // Envoyer notification si nouveau palier plus élevé
  if (isLevelEscalation(previousLevel, newLevel)) {
    await sendAlertNotification(supabase, instance, newLevel, operatorId)
  }

  console.info(`[MONITOR:CRON] ${instance.slug}: ${previousLevel} → ${newLevel}, dbRows=${metrics.dbRows}`)
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Récupérer l'operator_id depuis operators (premier opérateur actif)
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .limit(1)
    .maybeSingle()

  const operatorId = (operator as { id: string } | null)?.id ?? ''

  // Fetch toutes les instances actives
  const { data: instances, error: fetchError } = await supabase
    .from('client_instances')
    .select('id, client_id, slug, instance_url, instance_secret, status, alert_level, usage_metrics, metadata')
    .eq('status', 'active')

  if (fetchError || !instances) {
    console.error('[MONITOR:CRON] Failed to fetch instances:', fetchError)
    return new Response('Error fetching instances', { status: 500 })
  }

  let processed = 0
  let errors = 0

  for (const instance of instances as ClientInstance[]) {
    try {
      await processInstance(supabase, instance, operatorId)
      processed++
    } catch (err) {
      console.error(`[MONITOR:CRON] Unexpected error for ${instance.slug}:`, err)
      errors++
    }
  }

  console.info(`[MONITOR:CRON] Done. Processed=${processed}, Errors=${errors}`)
  return new Response(
    JSON.stringify({ processed, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
