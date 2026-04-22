'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { ReopenStepInput, type ReopenStepResult } from '../types/parcours.types'

export async function reopenStep(
  input: { stepId: string; reason?: string }
): Promise<ActionResponse<ReopenStepResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Guard auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Guard is_operator() — vérifier que l'utilisateur est dans la table operators
    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!operator) {
      return errorResponse('Accès refusé', 'FORBIDDEN')
    }

    // Validation input
    const parsed = ReopenStepInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { stepId, reason } = parsed.data

    // Récupérer l'étape avec ses infos
    const { data: step, error: stepError } = await supabase
      .from('parcours_steps')
      .select('id, step_number, title, status, parcours_id')
      .eq('id', stepId)
      .single()

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', stepError)
    }

    // Guard status === 'completed'
    if (step.status !== 'completed') {
      return errorResponse('Seule une étape complétée peut être rouverte', 'INVALID_STATUS')
    }

    // Récupérer le client_id depuis le parcours
    const { data: parcours, error: parcoursError } = await supabase
      .from('parcours')
      .select('client_id')
      .eq('id', step.parcours_id)
      .single()

    if (parcoursError || !parcours) {
      return errorResponse('Parcours non trouvé', 'NOT_FOUND', parcoursError)
    }

    // UPDATE parcours_steps : status → 'current', completed_at → NULL, validation_id → NULL
    const { error: updateStepError } = await supabase
      .from('parcours_steps')
      .update({
        status: 'current',
        completed_at: null,
        validation_id: null,
      })
      .eq('id', stepId)

    if (updateStepError) {
      return errorResponse('Échec mise à jour de l\'étape', 'DATABASE_ERROR', updateStepError)
    }

    // UPDATE dernière soumission approved → revision_requested
    const { data: lastApproved } = await supabase
      .from('step_submissions')
      .select('id')
      .eq('parcours_step_id', stepId)
      .eq('status', 'approved')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastApproved) {
      await supabase
        .from('step_submissions')
        .update({ status: 'revision_requested' })
        .eq('id', lastApproved.id)
    }

    // INSERT notification client
    const notifBody = reason
      ? `MiKL a rouvert l'étape ${step.step_number} — ${reason}`
      : `MiKL a rouvert l'étape ${step.step_number}`

    await supabase.from('notifications').insert({
      recipient_type: 'client',
      recipient_id: parcours.client_id,
      type: 'info',
      title: `Étape ${step.step_number} rouverte`,
      body: notifBody,
      link: '/modules/parcours',
    })

    console.log('[PARCOURS:REOPEN] Étape rouverte:', stepId, '| Client:', parcours.client_id)

    return successResponse({ reopened: true })
  } catch (error) {
    console.error('[PARCOURS:REOPEN] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', { message: error instanceof Error ? error.message : String(error) })
  }
}
