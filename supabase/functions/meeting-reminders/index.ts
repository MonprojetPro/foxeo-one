// Edge Function: meeting-reminders
// Lot 2 emails (2026-07-26) — Rappel de rendez-vous visio ~24 h avant.
//
// Exécution : quotidienne via pg_cron (job `meeting-reminders-daily`, 9h00 UTC).
//
// Pourquoi une fenêtre glissante [now+12h, now+36h] et pas « les RDV de demain » :
// calculer « demain » impose de gérer le fuseau Europe/Paris ET le passage
// heure d'été/hiver — source classique de rappels envoyés au mauvais moment.
// La fenêtre glissante n'a aucun piège de fuseau : avec un run quotidien, tout
// RDV y tombe au moins une fois, et l'anti-doublon garantit UN seul rappel.
//
// Anti-doublon : `meetings.metadata.reminder_sent_at`. Si le cron passe deux
// fois (relance manuelle, rattrapage), le client n'est pas rappelé deux fois.
//
// L'INSERT dans `notifications` déclenche trg_send_email_on_notification ->
// send-email -> Resend. Aucun envoi d'email direct ici.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface MeetingRow {
  id: string
  client_id: string | null
  operator_id: string
  title: string
  scheduled_at: string
  metadata: Record<string, unknown> | null
}

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[MEETING:REMINDERS] Missing environment variables')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const now = Date.now()
  const windowStart = new Date(now + 12 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now + 36 * 60 * 60 * 1000).toISOString()

  const { data: meetings, error: meetingsError } = await supabase
    .from('meetings')
    .select('id, client_id, operator_id, title, scheduled_at, metadata')
    .eq('status', 'scheduled')
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)

  if (meetingsError) {
    console.error('[MEETING:REMINDERS] Fetch meetings failed:', meetingsError.message)
    return new Response(JSON.stringify({ error: meetingsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rows = (meetings ?? []) as MeetingRow[]
  // Déjà rappelés (cron rejoué, rattrapage manuel) -> on les ignore
  const pending = rows.filter((m) => !m.metadata?.reminder_sent_at)

  console.log(
    `[MEETING:REMINDERS] ${rows.length} RDV dans la fenêtre, ${pending.length} à rappeler`
  )

  if (pending.length === 0) {
    return new Response(JSON.stringify({ found: rows.length, reminded: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Résolution des destinataires : recipient_id = auth_user_id (convention
  // notifications). Avec clients.id, la notification ET l'email sont perdus.
  const clientIds = [...new Set(pending.map((m) => m.client_id).filter(Boolean))] as string[]
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, auth_user_id')
    .in('id', clientIds)

  const clientMap = new Map(
    ((clients ?? []) as Array<{ id: string; name: string; auth_user_id: string | null }>).map((c) => [
      c.id,
      c,
    ])
  )

  let reminded = 0
  const operatorAgenda: string[] = []

  for (const meeting of pending) {
    const client = meeting.client_id ? clientMap.get(meeting.client_id) : null
    const whenLabel = formatDateFr(meeting.scheduled_at)

    if (client?.auth_user_id) {
      const { error: notifError } = await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: client.auth_user_id,
        type: 'system',
        title: `Rappel : votre rendez-vous ${whenLabel}`,
        body: `Votre rendez-vous « ${meeting.title} » est prévu ${whenLabel}. Vous le retrouverez dans votre espace, rubrique Visio.`,
        link: '/modules/visio',
      })

      if (notifError) {
        console.error(
          `[MEETING:REMINDERS] Notification client échouée pour ${meeting.id}:`,
          notifError.message
        )
        // On NE marque pas comme rappelé : le prochain run retentera.
        continue
      }
    } else {
      console.warn(
        `[MEETING:REMINDERS] RDV ${meeting.id} sans client rattaché (auth_user_id absent) — client non rappelé`
      )
    }

    // Marque le rappel APRÈS la notification réussie (sinon un échec d'envoi
    // serait définitivement perdu — cf. leçon DB-004 sur la relance facture).
    const { error: markError } = await supabase
      .from('meetings')
      .update({
        metadata: { ...(meeting.metadata ?? {}), reminder_sent_at: new Date().toISOString() },
      })
      .eq('id', meeting.id)

    if (markError) {
      console.error(`[MEETING:REMINDERS] Marquage échoué pour ${meeting.id}:`, markError.message)
    }

    operatorAgenda.push(`• ${whenLabel} — ${meeting.title}${client ? ` (${client.name})` : ''}`)
    reminded++
  }

  // Récapitulatif unique pour l'opérateur (un seul mail, pas un par RDV)
  if (operatorAgenda.length > 0) {
    const { data: operators } = await supabase.from('operators').select('auth_user_id')
    const operatorRows = ((operators ?? []) as Array<{ auth_user_id: string | null }>)
      .filter((op) => op.auth_user_id)
      .map((op) => ({
        recipient_type: 'operator',
        recipient_id: op.auth_user_id,
        type: 'system',
        title: `${operatorAgenda.length} rendez-vous dans les prochaines 24 h`,
        body: operatorAgenda.join('\n'),
        link: '/modules/visio',
      }))

    if (operatorRows.length > 0) {
      const { error: opNotifError } = await supabase.from('notifications').insert(operatorRows)
      if (opNotifError) {
        console.error('[MEETING:REMINDERS] Récap opérateur échoué:', opNotifError.message)
      }
    }
  }

  console.log(`[MEETING:REMINDERS] Terminé — ${reminded} rappels envoyés`)

  return new Response(JSON.stringify({ found: rows.length, reminded }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
