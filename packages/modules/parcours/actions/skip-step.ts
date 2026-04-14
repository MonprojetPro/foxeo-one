'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ParcoursStep, ParcoursStepDB } from '../types/parcours.types'
import { SkipStepInput } from '../types/parcours.types'
import { toParcoursStep } from '../utils/parcours-mappers'

export async function skipStep(
  input: { stepId: string }
): Promise<ActionResponse<ParcoursStep>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = SkipStepInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Vérifier que l'étape est "current" avant de la skipper
    const { data: step, error: stepError } = await supabase
      .from('parcours_steps')
      .select('id, status, step_number, parcours_id')
      .eq('id', parsed.data.stepId)
      .single()

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', stepError)
    }

    if (step.status !== 'current') {
      return errorResponse('Seule l\'étape en cours peut être skippée', 'INVALID_STATUS')
    }

    // Marquer comme skipped
    const { data: updated, error: updateError } = await supabase
      .from('parcours_steps')
      .update({ status: 'skipped' })
      .eq('id', parsed.data.stepId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('[PARCOURS:SKIP_STEP] Error:', updateError)
      return errorResponse('Impossible de skipper l\'étape', 'DB_ERROR', updateError)
    }

    // Unlock l'étape suivante
    const nextStepNumber = step.step_number + 1
    const { data: nextStep } = await supabase
      .from('parcours_steps')
      .select('id')
      .eq('parcours_id', step.parcours_id)
      .eq('step_number', nextStepNumber)
      .single()

    if (nextStep) {
      await supabase
        .from('parcours_steps')
        .update({ status: 'current' })
        .eq('id', nextStep.id)
    }

    console.log('[PARCOURS:SKIP_STEP] Step skipped:', parsed.data.stepId)

    return successResponse(toParcoursStep(updated as ParcoursStepDB))
  } catch (error) {
    console.error('[PARCOURS:SKIP_STEP] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
