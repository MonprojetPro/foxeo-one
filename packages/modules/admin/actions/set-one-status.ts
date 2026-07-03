'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

const SetOneStatusSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  oneStatus: z.enum(['construction', 'delivered']),
})

/**
 * Bascule le cycle de vie visuel du One d'un client : « en chantier » ↔ « livré ».
 * Vision v2 §6 — purement visuel côté client (bandeau chantier + cockpits qui
 * s'allument), aucune restriction d'accès. La table client_configs a un trigger
 * broadcast Realtime → la bascule est instantanée côté client (router.refresh).
 */
export async function setOneStatus(
  clientId: string,
  oneStatus: 'construction' | 'delivered',
): Promise<ActionResponse<{ oneStatus: 'construction' | 'delivered' }>> {
  const parsed = SetOneStatusSchema.safeParse({ clientId, oneStatus })
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!operator) return errorResponse('Accès réservé aux opérateurs', 'UNAUTHORIZED')

    // Le client doit appartenir à l'opérateur
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .eq('operator_id', operator.id)
      .single()
    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ one_status: oneStatus })
      .eq('client_id', clientId)

    if (updateError) {
      console.error('[ADMIN:SET_ONE_STATUS] Update error:', updateError)
      return errorResponse('Erreur lors de la bascule chantier/livré', 'DATABASE_ERROR')
    }

    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: oneStatus === 'delivered' ? 'one_delivered' : 'one_back_to_construction',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { oneStatus, clientName: client.name },
    })

    return successResponse({ oneStatus })
  } catch (error) {
    console.error('[ADMIN:SET_ONE_STATUS] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}
