'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

// Met à jour hub_seen_at → badge "Nouveau" disparaît sur Hub
export async function markClientSeen(
  clientId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: isOperator } = await supabase.rpc('is_operator')
    if (!isOperator) return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')

    const { error } = await supabase
      .from('clients')
      .update({ hub_seen_at: new Date().toISOString() })
      .eq('id', clientId)
      .is('hub_seen_at', null) // idempotent — ne touche que si pas encore vu

    if (error) {
      console.error('[CRM:MARK_CLIENT_SEEN] Supabase error:', error)
      return errorResponse('Impossible de marquer le client comme vu', 'DATABASE_ERROR', error)
    }

    return successResponse(null)
  } catch (err) {
    console.error('[CRM:MARK_CLIENT_SEEN] Unexpected error:', err)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', err)
  }
}
