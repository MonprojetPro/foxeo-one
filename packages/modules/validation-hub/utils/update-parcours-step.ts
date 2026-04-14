import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'

/**
 * Marks a parcours step as completed.
 * Note: In production, this is handled atomically by the approve_validation_request RPC.
 * This utility is used for testing and as a reference implementation.
 */
export async function markStepCompleted(
  stepId: string
): Promise<ActionResponse<{ stepId: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('parcours_steps')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', stepId)

    if (error) {
      console.error('[VALIDATION-HUB:UPDATE_PARCOURS] markStepCompleted error:', error)
      return errorResponse("Impossible de marquer l'étape comme complétée", 'DATABASE_ERROR', error)
    }

    return successResponse({ stepId })
  } catch (err) {
    console.error('[VALIDATION-HUB:UPDATE_PARCOURS] markStepCompleted unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

/**
 * Finds the next step in a parcours (the first step with status 'locked').
 * Returns null stepId if no more locked steps exist (parcours is complete).
 */
export async function findNextStep(
  parcoursId: string
): Promise<ActionResponse<{ stepId: string | null }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('parcours_steps')
      .select('id')
      .eq('parcours_id', parcoursId)
      .eq('status', 'locked')
      .order('step_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[VALIDATION-HUB:UPDATE_PARCOURS] findNextStep error:', error)
      return errorResponse("Impossible de trouver l'étape suivante", 'DATABASE_ERROR', error)
    }

    return successResponse({ stepId: data?.id ?? null })
  } catch (err) {
    console.error('[VALIDATION-HUB:UPDATE_PARCOURS] findNextStep unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

/**
 * Checks whether a given step is the last step in a parcours
 * (i.e. no more 'locked' steps remain after marking current one 'completed').
 */
export async function isLastStep(
  parcoursId: string
): Promise<ActionResponse<{ isLast: boolean }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('parcours_steps')
      .select('id')
      .eq('parcours_id', parcoursId)
      .eq('status', 'locked')
      .limit(1)

    if (error) {
      console.error('[VALIDATION-HUB:UPDATE_PARCOURS] isLastStep error:', error)
      return errorResponse("Impossible de vérifier l'étape", 'DATABASE_ERROR', error)
    }

    return successResponse({ isLast: !data || data.length === 0 })
  } catch (err) {
    console.error('[VALIDATION-HUB:UPDATE_PARCOURS] isLastStep unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

/**
 * Marks a parcours as completed ('termine' in DB).
 */
export async function markParcoursCompleted(
  parcoursId: string
): Promise<ActionResponse<{ parcoursId: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('parcours')
      .update({ status: 'termine', completed_at: new Date().toISOString() })
      .eq('id', parcoursId)

    if (error) {
      console.error('[VALIDATION-HUB:UPDATE_PARCOURS] markParcoursCompleted error:', error)
      return errorResponse('Impossible de marquer le parcours comme terminé', 'DATABASE_ERROR', error)
    }

    return successResponse({ parcoursId })
  } catch (err) {
    console.error('[VALIDATION-HUB:UPDATE_PARCOURS] markParcoursCompleted unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
