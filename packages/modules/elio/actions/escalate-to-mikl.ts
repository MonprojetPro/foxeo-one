'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

/**
 * Server Action — Escalade une question client vers MiKL via notification.
 * Envoie la question + l'historique récent comme notification opérateur.
 * Retourne toujours { data, error } — jamais throw.
 * Story 8.7 — Task 9 (AC5)
 */
export async function escalateToMiKL(
  clientId: string,
  question: string,
  recentMessages: string[]
): Promise<ActionResponse<boolean>> {
  if (!clientId || !question.trim()) {
    return errorResponse('clientId et question sont requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('operator_id, name')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
  }

  // Récupérer l'auth_user_id de l'opérateur — c'est la clé utilisée par le système de notifications
  // (recipient_id = auth_user_id, pas operators.id)
  const { data: operator, error: operatorError } = await supabase
    .from('operators')
    .select('auth_user_id')
    .eq('id', client.operator_id)
    .single()

  if (operatorError || !operator?.auth_user_id) {
    return errorResponse('Opérateur non trouvé', 'NOT_FOUND', operatorError)
  }

  const historyText =
    recentMessages.length > 0
      ? `\n\nHistorique récent :\n${recentMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
      : ''

  const { error: notifError } = await supabase.from('notifications').insert({
    recipient_type: 'operator',
    recipient_id: operator.auth_user_id,
    type: 'elio_escalation',
    title: `Question escaladée par ${client.name}`,
    body: `Élio One n'était pas sûr de sa réponse.\n\nQuestion : "${question}"${historyText}`,
    link: `/modules/crm/clients/${clientId}`,
  })

  if (notifError) {
    console.error('[ELIO:ESCALATE] Notification error:', notifError)
    return errorResponse('Erreur lors de la création de la notification', 'DB_ERROR', notifError)
  }

  console.log('[ELIO:ESCALATE] Question escaladée pour client:', clientId)
  return successResponse(true)
}
