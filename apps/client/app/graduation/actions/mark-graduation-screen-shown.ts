'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

export async function markGraduationScreenShown(): Promise<ActionResponse<{ success: boolean }>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  console.log('[GRADUATION:COMPLETE] Marking graduation screen shown for:', user.id)

  // La RLS clients ne donne aucun droit UPDATE au client (un UPDATE direct est
  // filtré en silence : 0 row, pas d'erreur → boucle /graduation/celebrate).
  // On passe par la RPC SECURITY DEFINER dédiée (migration 00143).
  const { data: updated, error } = await supabase.rpc('fn_mark_graduation_screen_shown')

  if (error) {
    console.error('[GRADUATION:COMPLETE] RPC failed:', error.message)
    return errorResponse('Impossible de finaliser la graduation', 'UPDATE_FAILED', error)
  }

  if (updated !== true) {
    console.error('[GRADUATION:COMPLETE] Flag non posé (client introuvable ou non gradué):', user.id)
    return errorResponse('Impossible de finaliser la graduation', 'UPDATE_FAILED')
  }

  return successResponse({ success: true })
}
