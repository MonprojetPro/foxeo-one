// Edge Function: check-inactivity
// Story: 2.10 — Alertes inactivité Lab
// Exécution: quotidienne via pg_cron (job `check-inactivity-daily`, 8h05).
//
// Prévient l'opérateur quand un client Lab n'a plus donné signe de vie depuis
// `operators.inactivity_threshold_days` (7 par défaut). L'alerte crée une
// notification `inactivity_alert` -> le trigger `trg_send_email_on_notification`
// déclenche l'email (template `rappel_parcours` en base, sinon HTML intégré).
//
// Anti-spam : `client_configs.inactivity_alert_sent` passe à true après l'alerte
// et le trigger `trg_reset_inactivity_on_activity` le remet à false dès que le
// client redevient actif — donc une seule alerte par période d'inactivité.
//
// ⚠️ 2026-07-26 : cette fonction n'avait JAMAIS été déployée et écrivait sur un
// schéma `notifications` obsolète (operator_id / message / entity_type, colonnes
// qui n'existent pas). Réécrite sur le schéma réel :
// recipient_type + recipient_id (= auth_user_id) + title + body + link.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Operator {
  id: string
  auth_user_id: string | null
  inactivity_threshold_days: number | null
}

interface InactiveClient {
  id: string
  name: string
  email: string
  last_activity: string
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[CRM:CHECK_INACTIVITY] Missing environment variables')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Service role pour bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: operators, error: operatorsError } = await supabase
      .from('operators')
      .select('id, auth_user_id, inactivity_threshold_days')

    if (operatorsError) {
      console.error('[CRM:CHECK_INACTIVITY] Failed to fetch operators:', operatorsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch operators' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let totalAlerts = 0
    let skipped = 0

    for (const operator of (operators as Operator[]) ?? []) {
      // Sans compte auth, aucune notification ne peut lui être adressée
      if (!operator.auth_user_id) {
        console.warn(`[CRM:CHECK_INACTIVITY] Operator ${operator.id} sans auth_user_id — ignoré`)
        skipped++
        continue
      }

      const threshold = operator.inactivity_threshold_days ?? 7
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - threshold)

      const { data: inactiveClients, error: rpcError } = await supabase.rpc(
        'get_inactive_lab_clients',
        {
          p_operator_id: operator.id,
          p_cutoff_date: cutoffDate.toISOString(),
        }
      )

      if (rpcError) {
        console.error(`[CRM:CHECK_INACTIVITY] RPC error for operator ${operator.id}:`, rpcError)
        continue
      }

      for (const client of (inactiveClients as InactiveClient[]) ?? []) {
        const daysSinceActivity = Math.floor(
          (Date.now() - new Date(client.last_activity).getTime()) / (1000 * 60 * 60 * 24)
        )
        const lastActivityLabel = new Date(client.last_activity).toLocaleDateString('fr-FR')

        // Le titre et le corps sont PARSÉS par send-email (renderTemplate, cas
        // 'inactivity_alert') pour reconstituer nom / jours / date : ne pas
        // changer ces formulations sans adapter la fonction send-email.
        const { error: notifError } = await supabase.from('notifications').insert({
          recipient_type: 'operator',
          recipient_id: operator.auth_user_id,
          type: 'inactivity_alert',
          title: `Client inactif : ${client.name}`,
          body: `${client.name} est inactif depuis ${daysSinceActivity} jours. Dernière activité : ${lastActivityLabel}.`,
          link: `/clients/${client.id}`,
        })

        if (notifError) {
          console.error(
            `[CRM:CHECK_INACTIVITY] Notification insert error for client ${client.id}:`,
            notifError
          )
          continue
        }

        const { error: flagError } = await supabase
          .from('client_configs')
          .update({ inactivity_alert_sent: true })
          .eq('client_id', client.id)

        if (flagError) {
          console.error(
            `[CRM:CHECK_INACTIVITY] Flag update error for client ${client.id}:`,
            flagError
          )
          continue
        }

        totalAlerts++
      }
    }

    console.log(`[CRM:CHECK_INACTIVITY] Completed: ${totalAlerts} alerts sent, ${skipped} operators skipped`)

    return new Response(JSON.stringify({ success: true, alertsSent: totalAlerts, skipped }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[CRM:CHECK_INACTIVITY] Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
