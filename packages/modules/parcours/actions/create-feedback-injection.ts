'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { CreateFeedbackInjectionInput } from '../types/parcours.types'

export interface CreateFeedbackInjectionResult {
  injectionId: string
}

/**
 * Server Action Hub — Envoie un message MiKL sur une étape client.
 *
 * Deux modes radicalement différents :
 * - 'text_feedback'  : message VISIBLE tel quel dans l'historique de l'étape (step_feedback_injections).
 * - 'elio_questions' : FEUILLE DE ROUTE CACHÉE pour Élio. Le contenu n'est jamais montré au client ;
 *   il oriente les prochaines questions d'Élio et renvoie l'étape au client (révision).
 *   Géré par la RPC inject_elio_roadmap (SECURITY DEFINER) qui contourne la RLS owner-only,
 *   stocke la consigne dans client_step_contexts, réactive l'étape et notifie le client.
 *
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

  // ── Mode 'elio_questions' : feuille de route cachée + renvoi de l'étape ──────
  // Tout est fait atomiquement côté base par la RPC SECURITY DEFINER (la session
  // opérateur ne peut pas écrire dans les tables du client à cause de la RLS).
  if (type === 'elio_questions') {
    const { data: contextId, error: roadmapError } = await supabase.rpc('inject_elio_roadmap', {
      p_step_id: stepId,
      p_client_id: clientId,
      p_content: content,
    })

    if (roadmapError) {
      return errorResponse(
        "Erreur lors de l'injection de la feuille de route Élio",
        'DB_ERROR',
        { message: roadmapError.message }
      )
    }

    return successResponse({ injectionId: String(contextId) })
  }

  // ── Mode 'text_feedback' : message visible dans l'historique de l'étape ──────
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

  // Notification client (best-effort) — la soumission du feedback est déjà persistée.
  // IMPORTANT : recipient_id = auth_user_id du client (cf. RLS notifications : recipient_id = auth.uid()),
  // type dans la liste autorisée ('message'), title NOT NULL requis, et PAS de colonne `read`
  // (remplacée par read_at). L'ancienne version utilisait clients.id + type 'step_feedback' + read,
  // ce qui faisait silencieusement échouer l'INSERT → aucune notification côté client.
  const { data: clientRow } = await supabase
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .maybeSingle() as { data: { auth_user_id: string | null } | null }

  const { data: stepRow } = await supabase
    .from('client_parcours_agents')
    .select('step_order')
    .eq('id', stepId)
    .maybeSingle() as { data: { step_order: number | null } | null }

  const stepOrder = stepRow?.step_order ?? null
  const stepLabel = stepOrder ? `l'étape ${stepOrder}` : 'votre étape'

  if (clientRow?.auth_user_id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      recipient_type: 'client',
      recipient_id: clientRow.auth_user_id,
      type: 'message',
      title: 'MiKL t\'a envoyé un feedback',
      body: `MiKL t'a laissé un feedback sur ${stepLabel}.`,
      link: stepOrder ? `/modules/parcours/steps/${stepOrder}` : '/modules/parcours',
    })
    if (notifError) {
      console.error('[PARCOURS:FEEDBACK-NOTIF] Notification insert error:', notifError)
    }
  }

  return successResponse({ injectionId: injection.id })
}
