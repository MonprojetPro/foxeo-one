'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

/**
 * Server Action — Soumet une demande d'évolution au Validation Hub.
 * Crée l'entrée dans validation_requests + notification MiKL.
 * Story 8.8 — Task 4 (AC4)
 * Retourne toujours { data, error } — jamais throw.
 */
export async function submitEvolutionRequest(
  clientId: string,
  title: string,
  content: string
): Promise<ActionResponse<boolean>> {
  if (!clientId || !title.trim() || !content.trim()) {
    return errorResponse('clientId, titre et contenu sont requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Récupérer l'opérateur du client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('operator_id, name')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
  }

  // 2. Créer la demande dans validation_requests (type=evolution_one)
  const { error: requestError } = await supabase
    .from('validation_requests')
    .insert({
      client_id: clientId,
      operator_id: client.operator_id,
      type: 'evolution_one',
      title: title.trim(),
      content: content.trim(),
      status: 'pending',
    })

  if (requestError) {
    console.error('[ELIO:EVOLUTION] Validation request error:', requestError)
    return errorResponse('Erreur lors de la création de la demande', 'DB_ERROR', requestError)
  }

  // 3. Notification MiKL
  const { error: notifError } = await supabase.from('notifications').insert({
    recipient_type: 'operator',
    recipient_id: client.operator_id,
    type: 'validation',
    title: `Nouvelle demande d'évolution de ${client.name} — ${title.trim()}`,
    body: content.trim(),
    link: '/modules/validation-hub',
  })

  if (notifError) {
    console.error('[ELIO:EVOLUTION] Notification error:', notifError)
    // Non-bloquant : la demande est créée, seule la notif a échoué
  }

  console.log('[ELIO:EVOLUTION] Demande soumise pour client:', clientId)
  return successResponse(true)
}
