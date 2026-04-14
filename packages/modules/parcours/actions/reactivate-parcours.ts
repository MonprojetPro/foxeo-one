'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { ReactivateParcoursInput } from '../types/parcours.types'
import { createNotification } from '../../notifications/actions/create-notification'

export async function reactivateParcours(
  input: { clientId: string }
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = ReactivateParcoursInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId } = parsed.data

    // RBAC: verify authenticated user is an operator
    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!operator) {
      return errorResponse('Seul un opérateur peut réactiver un parcours', 'FORBIDDEN')
    }

    // Fetch parcours
    const { data: parcours, error: parcoursError } = await supabase
      .from('parcours')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (parcoursError || !parcours) {
      return errorResponse('Parcours non trouvé', 'NOT_FOUND', parcoursError)
    }

    if (parcours.status !== 'abandoned') {
      return errorResponse(
        'Le parcours n\'est pas en statut abandonné',
        'PARCOURS_NOT_ABANDONED'
      )
    }

    // Update parcours status back to en_cours
    const { error: updateError } = await supabase
      .from('parcours')
      .update({
        status: 'en_cours',
        completed_at: null,
        abandonment_reason: null,
      })
      .eq('id', parcours.id)

    if (updateError) {
      console.error('[PARCOURS:REACTIVATE] Update failed:', updateError)
      return errorResponse('Impossible de réactiver le parcours', 'DATABASE_ERROR', updateError)
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: parcours.operator_id,
      action: 'parcours_reactivated',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { parcours_id: parcours.id },
    })

    // Notify client
    const { data: client } = await supabase
      .from('clients')
      .select('auth_user_id, name')
      .eq('id', clientId)
      .single()

    if (client?.auth_user_id) {
      await createNotification({
        recipientType: 'client',
        recipientId: client.auth_user_id,
        type: 'system',
        title: 'Bonne nouvelle ! Votre parcours Lab a été réactivé par MiKL.',
        body: 'Vous pouvez reprendre votre parcours de création là où vous l\'aviez laissé.',
        link: '/modules/parcours',
      })
    }

    return successResponse(undefined)
  } catch (error) {
    console.error('[PARCOURS:REACTIVATE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
