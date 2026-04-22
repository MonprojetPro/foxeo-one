'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { CreateFeedbackInjectionInput } from '../types/parcours.types'

export interface CreateFeedbackInjectionResult {
  injectionId: string
}

/**
 * Server Action Hub — Injecte un feedback MiKL sur une étape client.
 * - type 'text_feedback' : visible dans l'historique étape (step_feedback_injections seulement)
 * - type 'elio_questions' : injecté aussi dans elio_messages de la conversation d'étape
 * Retourne toujours { data, error } — jamais throw.
 */
export async function createFeedbackInjection(
  input: CreateFeedbackInjectionInput
): Promise<ActionResponse<CreateFeedbackInjectionResult>> {
  const parsed = CreateFeedbackInjectionInput.safeParse(input)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Données invalides',
      'VALIDATION_ERROR'
    )
  }

  const { stepId, clientId, content, type } = parsed.data

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  // Vérifier que l'utilisateur est opérateur
  const { data: isOperatorResult } = await supabase.rpc('is_operator')
  if (!isOperatorResult) {
    return errorResponse('Accès refusé — opérateurs uniquement', 'FORBIDDEN')
  }

  // Insérer l'injection de feedback
  const { data: injection, error: insertError } = await supabase
    .from('step_feedback_injections')
    .insert({
      step_id: stepId,
      operator_id: user.id,
      client_id: clientId,
      content,
      type,
    })
    .select('id')
    .single()

  if (insertError || !injection) {
    return errorResponse(
      "Erreur lors de la création de l'injection",
      'DB_ERROR',
      { message: insertError?.message ?? 'Insertion échouée' }
    )
  }

  // Si type = 'elio_questions' : injecter dans elio_messages de la conversation d'étape
  if (type === 'elio_questions') {
    const { data: conversation } = await supabase
      .from('elio_conversations')
      .select('id')
      .eq('step_id', stepId)
      .maybeSingle()

    // Ne pas injecter si le client n'a pas encore commencé la conversation
    if (conversation) {
      await supabase.from('elio_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content,
        metadata: {
          source: 'operator_injection',
          injection_id: injection.id,
        },
      })
    }
  }

  // Notification client
  const { data: step } = await supabase
    .from('parcours_steps')
    .select('step_number')
    .eq('id', stepId)
    .maybeSingle()

  const stepLabel = step ? `l'étape ${step.step_number}` : "votre étape"

  await supabase.from('notifications').insert({
    recipient_type: 'client',
    recipient_id: clientId,
    type: 'step_feedback',
    body: `MiKL vous a envoyé des questions sur ${stepLabel}`,
    read: false,
  })

  return successResponse({ injectionId: injection.id })
}
