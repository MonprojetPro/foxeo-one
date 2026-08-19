'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import type { ProactiveAlert } from '../types/elio.types'
import { formatAlertMessage } from '../utils/evaluate-alert-rule'

/**
 * Story 8.9c — Task 6
 * Server Action — Envoie une alerte proactive Élio One+ :
 *   6.2 — Crée un message Élio dans la conversation active
 *   6.3 — Crée une notification in-app de type 'alert'
 *   6.4 — Met à jour lastTriggered dans les prefs (appelant responsable de la persistance)
 *
 * Retourne { data: true, error: null } si succès.
 */
export async function sendProactiveAlert(
  clientId: string,
  alert: ProactiveAlert,
  data: Record<string, unknown> = {}
): Promise<ActionResponse<boolean>> {
  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  // Task 6.1 — Formater le message avec les données
  const formattedMessage = formatAlertMessage(alert.message, data)
  const elioContent = `🔔 **Alerte** : ${formattedMessage}`

  const supabase = await createServerSupabaseClient()

  // Task 6.2 — Créer un message dans la conversation Élio active
  const { data: conversation } = await supabase
    .from('elio_conversations')
    .select('id')
    .eq('user_id', clientId)
    .eq('dashboard_type', 'one')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let messageInserted = false
  if (conversation) {
    const { error: msgError } = await supabase.from('elio_messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: elioContent,
      metadata: { proactive_alert: true, alert_id: alert.id },
    })

    if (msgError) {
      console.error('[ELIO:ALERTS] Failed to insert alert message', msgError)
    } else {
      messageInserted = true
    }
  }

  // Task 6.3 — Créer une notification in-app de type 'alert'
  //
  // Correction 2026-08-19 : cet INSERT visait `user_id` / `content`, deux colonnes qui
  // n'existent pas sur `notifications` (schéma réel : recipient_type + recipient_id + body,
  // et recipient_id = auth_user_id, jamais clients.id). Toutes les alertes partaient donc
  // en erreur silencieuse. Cf. mémoire projet « Convention INSERT notifications ».
  const { data: clientRow } = await supabase
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .single()

  if (!clientRow?.auth_user_id) {
    console.error('[ELIO:ALERTS] auth_user_id introuvable pour le client', clientId)
    return errorResponse('Destinataire introuvable', 'NOT_FOUND')
  }

  const { error: notifError } = await supabase.from('notifications').insert({
    recipient_type: 'client',
    recipient_id: clientRow.auth_user_id,
    type: 'alert',
    title: 'Alerte Élio',
    body: formattedMessage,
    link: `/modules/${alert.moduleId}`,
  })

  if (notifError) {
    console.error('[ELIO:ALERTS] Failed to insert notification', notifError)
    return errorResponse('Erreur lors de la création de la notification', 'DB_ERROR', notifError)
  }

  if (conversation && !messageInserted) {
    console.error('[ELIO:ALERTS] Notification sent but Élio message failed for', alert.id)
  }

  return successResponse(true)
}
