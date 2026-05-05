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

    // Fetch client info (operator_id nécessaire pour notification + INSERT nouveau système)
    const { data: client } = await supabase
      .from('clients')
      .select('name, operator_id')
      .eq('id', clientId)
      .single()

    if (!client) {
      return errorResponse('Client non trouvé', 'NOT_FOUND')
    }

    // Try old system first (table parcours)
    const { data: parcours } = await supabase
      .from('parcours')
      .select('id, status')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let totalSteps = 0
    let completedSteps = 0

    if (parcours) {
      // Ancien système — valider le statut
      if (parcours.status === 'termine' || parcours.status === 'abandoned') {
        return errorResponse(
          'Ce parcours est déjà terminé ou abandonné',
          'PARCOURS_ALREADY_COMPLETED'
        )
      }

      // Compter les étapes depuis parcours_steps
      const { data: steps } = await supabase
        .from('parcours_steps')
        .select('id, status')
        .eq('parcours_id', parcours.id)
      totalSteps = steps?.length ?? 0
      completedSteps = steps?.filter((s: { status: string }) => s.status === 'completed').length ?? 0

      // Mettre à jour le statut
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
    } else {
      // Nouveau système (client_parcours_agents) — vérifier que des étapes existent
      const { data: agentSteps } = await supabase
        .from('client_parcours_agents')
        .select('id, status')
        .eq('client_id', clientId)

      if (!agentSteps || agentSteps.length === 0) {
        return errorResponse('Parcours non trouvé', 'NOT_FOUND')
      }

      totalSteps = agentSteps.length
      completedSteps = agentSteps.filter((s: { status: string }) => s.status === 'completed').length

      // Créer un enregistrement parcours pour tracker l'abandon
      // (policy parcours_insert_owner — migration 00113)
      const { error: insertError } = await supabase
        .from('parcours')
        .insert({
          client_id: clientId,
          operator_id: client.operator_id,
          status: 'abandoned',
          completed_at: new Date().toISOString(),
          abandonment_reason: reason ?? null,
        })

      if (insertError) {
        console.error('[PARCOURS:ABANDON] Insert failed:', insertError)
        return errorResponse('Impossible d\'enregistrer l\'abandon', 'DATABASE_ERROR', insertError)
      }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      actor_type: 'client',
      actor_id: clientId,
      action: 'parcours_abandoned',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        reason: reason ?? null,
        progression: `${completedSteps}/${totalSteps}`,
      },
    })

    // Notifier MiKL (opérateur)
    if (client.operator_id) {
      const { data: operator } = await supabase
        .from('operators')
        .select('auth_user_id')
        .eq('id', client.operator_id)
        .single()

      if (operator?.auth_user_id) {
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
