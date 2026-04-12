'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ProspectStage } from '../types/crm.types'

// Met à jour prospect_stage manuellement par MiKL
export async function updateProspectStage(
  clientId: string,
  stage: ProspectStage
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: isOperator } = await supabase.rpc('is_operator')
    if (!isOperator) return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')

    const validStages: ProspectStage[] = ['nouveau', 'qualifié', 'sans_suite']
    if (!validStages.includes(stage)) {
      return errorResponse('Statut prospect invalide', 'INVALID_INPUT')
    }

    const { error } = await supabase
      .from('clients')
      .update({ prospect_stage: stage })
      .eq('id', clientId)
      .eq('status', 'prospect') // sécurité : uniquement pour les prospects

    if (error) {
      console.error('[CRM:UPDATE_PROSPECT_STAGE] Supabase error:', error)
      return errorResponse('Impossible de mettre à jour le statut', 'DATABASE_ERROR', error)
    }

    return successResponse(null)
  } catch (err) {
    console.error('[CRM:UPDATE_PROSPECT_STAGE] Unexpected error:', err)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', err)
  }
}
