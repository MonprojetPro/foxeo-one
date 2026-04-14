'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { Parcours as ParcoursSchema } from '../types/crm.types'
import type { Parcours } from '../types/crm.types'

type SuspendAction = 'suspend' | 'reactivate'

export async function suspendParcours(
  parcoursId: string,
  action: SuspendAction
): Promise<ActionResponse<Parcours>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    if (!parcoursId) {
      return errorResponse('ID parcours requis', 'VALIDATION_ERROR')
    }

    if (action !== 'suspend' && action !== 'reactivate') {
      return errorResponse('Action invalide', 'VALIDATION_ERROR')
    }

    // Get current parcours
    const { data: current, error: fetchError } = await supabase
      .from('parcours')
      .select('*')
      .eq('id', parcoursId)
      .single()

    if (fetchError || !current) {
      return errorResponse('Parcours non trouvé', 'NOT_FOUND')
    }

    // Validate state transition
    if (action === 'suspend' && current.status !== 'en_cours') {
      return errorResponse(
        'Seul un parcours en cours peut être suspendu',
        'INVALID_STATE'
      )
    }

    if (action === 'reactivate' && current.status !== 'suspendu') {
      return errorResponse(
        'Seul un parcours suspendu peut être réactivé',
        'INVALID_STATE'
      )
    }

    const updateData = action === 'suspend'
      ? { status: 'suspendu', suspended_at: new Date().toISOString() }
      : { status: 'en_cours', suspended_at: null }

    const { data: updated, error: updateError } = await supabase
      .from('parcours')
      .update(updateData)
      .eq('id', parcoursId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('[CRM:SUSPEND_PARCOURS] Update error:', updateError)
      return errorResponse(
        `Impossible de ${action === 'suspend' ? 'suspendre' : 'réactiver'} le parcours`,
        'DATABASE_ERROR',
        updateError
      )
    }

    // Get operator for logging
    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (operator) {
      await supabase.from('activity_logs').insert({
        actor_type: 'operator',
        actor_id: operator.id,
        action: `parcours_${action === 'suspend' ? 'suspended' : 'reactivated'}`,
        entity_type: 'parcours',
        entity_id: parcoursId,
        metadata: { clientId: updated.client_id },
      })
    }

    const result = ParcoursSchema.parse({
      id: updated.id,
      clientId: updated.client_id,
      templateId: updated.template_id,
      operatorId: updated.operator_id,
      activeStages: updated.active_stages,
      status: updated.status,
      startedAt: updated.started_at,
      suspendedAt: updated.suspended_at,
      completedAt: updated.completed_at,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    })

    return successResponse(result)
  } catch (error) {
    console.error('[CRM:SUSPEND_PARCOURS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
