'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const reactivateLabSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  clientId: z.string().uuid('clientId doit être un UUID valide'),
  parcoursId: z.string().uuid('parcoursId doit être un UUID valide'),
})

export async function reactivateLab(
  requestId: string,
  clientId: string,
  parcoursId: string
): Promise<ActionResponse<ValidationRequest>> {
  try {
    const validated = reactivateLabSchema.safeParse({ requestId, clientId, parcoursId })
    if (!validated.success) {
      return errorResponse('Données invalides', 'VALIDATION_ERROR', validated.error)
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // 1. Mark request as approved
    const { data, error } = await supabase
      .from('validation_requests')
      .update({
        status: 'approved',
        reviewer_comment: 'Besoin redirigé vers le parcours Lab',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('[VALIDATION-HUB:REACTIVATE-LAB] Error updating request:', error)
      return errorResponse('Erreur lors de la réactivation', 'DB_ERROR', error)
    }

    // 2. Reactivate parcours if completed or suspended
    const { data: parcours } = await supabase
      .from('client_parcours')
      .select('id, status')
      .eq('id', parcoursId)
      .single()

    if (parcours && (parcours.status === 'completed' || parcours.status === 'suspended')) {
      const { error: parcoursError } = await supabase
        .from('client_parcours')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', parcoursId)

      if (parcoursError) {
        console.error('[VALIDATION-HUB:REACTIVATE-LAB] Error reactivating parcours:', parcoursError)
        // Non-blocking: main action succeeded
      }
    }

    // 3. Notify client
    const { data: clientData } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', clientId)
      .single()

    if (clientData?.auth_user_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_type: 'client',
          recipient_id: clientData.auth_user_id,
          type: 'validation',
          title: "MiKL a examiné votre demande — un accompagnement Lab va être mis en place",
          link: '/modules/parcours-lab',
        })
        .select('id')
        .single()

      if (notifError) {
        console.error('[VALIDATION-HUB:REACTIVATE-LAB] Error creating notification:', notifError)
        // Non-blocking
      }
    }

    return successResponse(toCamelCase(data) as ValidationRequest)
  } catch (err) {
    console.error('[VALIDATION-HUB:REACTIVATE-LAB] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
