'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ParcoursDB, ParcoursStepDB, ParcoursWithSteps } from '../types/parcours.types'
import { GetParcoursInput } from '../types/parcours.types'
import { toParcours, toParcoursStep } from '../utils/parcours-mappers'

export async function getParcours(
  input: { clientId: string }
): Promise<ActionResponse<ParcoursWithSteps>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetParcoursInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data: parcours, error: parcoursError } = await supabase
      .from('parcours')
      .select('*')
      .eq('client_id', parsed.data.clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (parcoursError || !parcours) {
      console.error('[PARCOURS:GET_PARCOURS] Parcours not found:', parcoursError)
      return errorResponse('Parcours non trouvé', 'NOT_FOUND', parcoursError)
    }

    const { data: steps, error: stepsError } = await supabase
      .from('parcours_steps')
      .select('*')
      .eq('parcours_id', (parcours as ParcoursDB).id)
      .order('step_number', { ascending: true })

    if (stepsError) {
      console.error('[PARCOURS:GET_PARCOURS] Steps error:', stepsError)
      return errorResponse('Erreur lors de la récupération des étapes', 'DB_ERROR', stepsError)
    }

    const mappedSteps = (steps as ParcoursStepDB[] ?? []).map(toParcoursStep)
    const completedSteps = mappedSteps.filter(s => s.status === 'completed').length
    const totalSteps = mappedSteps.length
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

    const result: ParcoursWithSteps = {
      ...toParcours(parcours as ParcoursDB),
      steps: mappedSteps,
      totalSteps,
      completedSteps,
      progressPercent,
    }

    return successResponse(result)
  } catch (error) {
    console.error('[PARCOURS:GET_PARCOURS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
