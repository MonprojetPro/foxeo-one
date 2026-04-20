'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ElioStepConfig, ElioStepConfigDB } from '../types/parcours.types'
import { toElioStepConfig } from '../utils/parcours-mappers'

export async function getStepElioConfig(
  input: { stepId: string }
): Promise<ActionResponse<ElioStepConfig | null>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    if (!input.stepId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.stepId)) {
      return errorResponse('stepId invalide', 'VALIDATION_ERROR')
    }

    const { data, error } = await supabase
      .from('elio_step_configs')
      .select('*')
      .eq('step_id', input.stepId)
      .maybeSingle()

    if (error) {
      console.error('[PARCOURS:GET_STEP_ELIO_CONFIG] DB error:', error)
      return errorResponse('Erreur lors de la récupération de la configuration', 'DB_ERROR', {
        message: error.message,
      })
    }

    return successResponse(data ? toElioStepConfig(data as ElioStepConfigDB) : null)
  } catch (error) {
    console.error('[PARCOURS:GET_STEP_ELIO_CONFIG] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
