'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { RequestAbandonmentInput } from '../types/parcours.types'
import { createNotification } from '../../notifications/actions/create-notification'

export async function requestParcoursAbandonment(
  input: { clientId: string; reason?: string }
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = RequestAbandonmentInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, reason } = parsed.data

    // Fetch parcours for this client
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

    // Validate status — only en_cours or suspendu can be abandoned
    if (parcours.status === 'termine' || parcours.status === 'abandoned') {
      return errorResponse(
        'Ce parcours est déjà terminé ou abandonné',
        'PARCOURS_ALREADY_COMPLETED'
      )
    }

    // Count progression for notification
    const { data: steps } = await supabase
      .from('parcours_steps')
      .select('id, status')
      .eq('parcours_id', parcours.id)

    const totalSteps = steps?.length ?? 0
    const completedSteps = steps?.filter((s: { status: string }) => s.status === 'completed').length ?? 0

    // Update parcours status to abandoned
    const { error: updateError } = await supabase
      .from('parcours')
      .update({
        status: 'abandoned',
        completed_at: new Date().toISOString(),
        abandonment_reason: reason ?? null,
      })
      .eq('id', parcours.id)

    if (updateError) {
      console.error('[PARCOURS:ABANDON] Update failed:', updateError)
      return errorResponse('Impossible de mettre à jour le parcours', 'DATABASE_ERROR', updateError)
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      actor_type: 'client',
      actor_id: clientId,
      action: 'parcours_abandoned',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        parcours_id: parcours.id,
        reason: reason ?? null,
        progression: `${completedSteps}/${totalSteps}`,
      },
    })

    // Fetch client info for notification
    const { data: client } = await supabase
      .from('clients')
      .select('name, operator_id')
      .eq('id', clientId)
      .single()

    if (client?.operator_id) {
      // Fetch operator auth_user_id
      const { data: operator } = await supabase
        .from('operators')
        .select('auth_user_id')
        .eq('id', client.operator_id)
        .single()

      if (operator?.auth_user_id) {
        // Send alert notification to MiKL
        const reasonText = reason || 'Aucune raison précisée'
        await createNotification({
          recipientType: 'operator',
          recipientId: operator.auth_user_id,
          type: 'alert',
          title: `Le client ${client.name} souhaite abandonner son parcours Lab`,
          body: `Raison : ${reasonText}. Progression : ${completedSteps}/${totalSteps} étapes. Contactez-le pour en discuter.`,
          link: `/modules/crm/clients/${clientId}`,
        })
      }
    }

    return successResponse(undefined)
  } catch (error) {
    console.error('[PARCOURS:ABANDON] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
