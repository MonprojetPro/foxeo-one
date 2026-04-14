'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ParcoursStep, ParcoursStepDB, ParcoursStepStatus } from '../types/parcours.types'
import { UpdateStepStatusInput } from '../types/parcours.types'
import { toParcoursStep } from '../utils/parcours-mappers'

/**
 * Valid status transitions — operator-level action.
 * Clients should use completeStep/skipStep for progression.
 * This action validates transitions to prevent invalid state changes.
 */
const VALID_TRANSITIONS: Record<ParcoursStepStatus, ParcoursStepStatus[]> = {
  locked: ['current'],        // Unlock: only via progression or operator
  current: ['completed', 'skipped', 'locked'], // Complete, skip, or re-lock
  completed: ['current'],     // Re-open a completed step (operator correction)
  skipped: ['current'],       // Re-open a skipped step (operator correction)
}

export async function updateStepStatus(
  input: { stepId: string; status: 'locked' | 'current' | 'completed' | 'skipped' }
): Promise<ActionResponse<ParcoursStep>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = UpdateStepStatusInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Fetch current step to validate transition
    const { data: currentStep, error: fetchError } = await supabase
      .from('parcours_steps')
      .select('id, status')
      .eq('id', parsed.data.stepId)
      .single()

    if (fetchError || !currentStep) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', fetchError)
    }

    const currentStatus = currentStep.status as ParcoursStepStatus
    const newStatus = parsed.data.status
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? []

    if (!allowedTransitions.includes(newStatus)) {
      return errorResponse(
        `Transition invalide: ${currentStatus} → ${newStatus}`,
        'INVALID_TRANSITION'
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('parcours_steps')
      .update({ status: newStatus })
      .eq('id', parsed.data.stepId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('[PARCOURS:UPDATE_STEP_STATUS] Error:', updateError)
      return errorResponse('Impossible de mettre à jour le statut', 'DB_ERROR', updateError)
    }

    return successResponse(toParcoursStep(updated as ParcoursStepDB))
  } catch (error) {
    console.error('[PARCOURS:UPDATE_STEP_STATUS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
