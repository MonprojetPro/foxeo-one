'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { LaunchClientParcoursInput } from '../types/parcours.types'

export async function launchClientParcours(
  input: LaunchClientParcoursInput
): Promise<ActionResponse<{ count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = LaunchClientParcoursInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, steps } = parsed.data

    const rows = steps.map((step, index) => ({
      client_id: clientId,
      elio_lab_agent_id: step.agentId,
      step_order: index + 1,
      step_label: step.stepLabel,
      status: 'pending' as const,
    }))

    const { error: insertError } = await supabase
      .from('client_parcours_agents')
      .insert(rows)

    if (insertError) {
      console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Insert error:', insertError)
      return errorResponse('Erreur lors du lancement du parcours', 'DB_ERROR', {
        message: insertError.message,
      })
    }

    return successResponse({ count: rows.length })
  } catch (error) {
    console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
