'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

export interface StepConversationResult {
  conversationId: string
  clientId: string
}

/**
 * Server Action — Trouve ou crée une conversation Élio liée à une étape du parcours.
 * Une seule conversation par (step_id, user_id) — persistée entre les visites.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function getOrCreateStepConversation(
  stepId: string
): Promise<ActionResponse<StepConversationResult>> {
  if (!stepId) {
    return errorResponse('stepId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  // Récupérer le client associé à l'utilisateur
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (clientError) {
    return errorResponse('Erreur lors de la récupération du client', 'DB_ERROR', clientError)
  }
  if (!client) {
    return errorResponse('Client non trouvé', 'NOT_FOUND')
  }

  // Chercher une conversation existante pour cette étape
  const { data: existing, error: selectError } = await supabase
    .from('elio_conversations')
    .select('id')
    .eq('step_id', stepId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (selectError) {
    return errorResponse('Erreur lors de la recherche de conversation', 'DB_ERROR', selectError)
  }

  if (existing) {
    return successResponse({ conversationId: existing.id, clientId: client.id })
  }

  // Récupérer les infos de l'étape pour le titre de la conversation
  const { data: step } = await supabase
    .from('parcours_steps')
    .select('step_number, title')
    .eq('id', stepId)
    .maybeSingle()

  const title = step
    ? `Étape ${step.step_number} — ${step.title}`
    : 'Conversation étape'

  // Créer une nouvelle conversation liée à l'étape
  const { data: conversation, error: insertError } = await supabase
    .from('elio_conversations')
    .insert({
      user_id: user.id,
      dashboard_type: 'lab',
      title,
      step_id: stepId,
    })
    .select('id')
    .single()

  if (insertError || !conversation) {
    return errorResponse(
      'Erreur lors de la création de la conversation',
      'DB_ERROR',
      insertError
    )
  }

  return successResponse({ conversationId: conversation.id, clientId: client.id })
}
