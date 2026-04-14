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
  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: clientId,
    type: 'alert',
    title: 'Alerte Élio',
    content: formattedMessage,
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
