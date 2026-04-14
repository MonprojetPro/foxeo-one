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

  const { error } = await supabase
    .from('clients')
    .update({ graduation_screen_shown: true })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('[GRADUATION:COMPLETE] Failed to update graduation_screen_shown:', error.message)
    return errorResponse('Impossible de finaliser la graduation', 'UPDATE_FAILED', error)
  }

  return successResponse({ success: true })
}
