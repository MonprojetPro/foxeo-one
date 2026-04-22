'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { AddParcoursStepInput } from '../types/parcours.types'

export async function addParcoursStep(
  input: AddParcoursStepInput
): Promise<ActionResponse<{ id: string; stepOrder: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = AddParcoursStepInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, agentId, stepLabel } = parsed.data

    // Trouver le step_order max actuel
    const { data: existing, error: fetchError } = await supabase
      .from('client_parcours_agents')
      .select('step_order')
      .eq('client_id', clientId)
      .order('step_order', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('[PARCOURS:ADD_PARCOURS_STEP] Fetch error:', fetchError)
      return errorResponse('Erreur lors de la récupération du parcours', 'DB_ERROR', {
        message: fetchError.message,
      })
    }

    const maxOrder = (existing?.[0] as { step_order: number } | undefined)?.step_order ?? 0
    const newOrder = maxOrder + 1

    const { data: inserted, error: insertError } = await supabase
      .from('client_parcours_agents')
      .insert({
        client_id: clientId,
        elio_lab_agent_id: agentId,
        step_order: newOrder,
        step_label: stepLabel,
        status: 'pending',
      })
      .select('id, step_order')
      .single()

    if (insertError || !inserted) {
      console.error('[PARCOURS:ADD_PARCOURS_STEP] Insert error:', insertError)
      return errorResponse("Erreur lors de l'ajout de l'étape", 'DB_ERROR', {
        message: insertError?.message,
      })
    }

    const row = inserted as { id: string; step_order: number }
    return successResponse({ id: row.id, stepOrder: row.step_order })
  } catch (error) {
    console.error('[PARCOURS:ADD_PARCOURS_STEP] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
