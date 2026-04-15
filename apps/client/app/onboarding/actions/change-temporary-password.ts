'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

const MIN_LENGTH = 10

/**
 * Story 13.4 — Premier login : l utilisateur change son mot de passe
 * temporaire. On met aussi clients.password_change_required = false.
 */
export async function changeTemporaryPassword(
  newPassword: string
): Promise<ActionResponse<{ ok: true }>> {
  if (typeof newPassword !== 'string' || newPassword.length < MIN_LENGTH) {
    return errorResponse(
      `Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères`,
      'WEAK_PASSWORD'
    )
  }

  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  // Change le mot de passe via l API auth — la session est active via cookies
  const { error: updateAuthError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateAuthError) {
    return errorResponse('Echec mise a jour mot de passe', 'AUTH_UPDATE_FAILED', updateAuthError)
  }

  // Retombe le flag password_change_required
  const { error: flagError } = await supabase
    .from('clients')
    .update({ password_change_required: false })
    .eq('auth_user_id', user.id)

  if (flagError) {
    return errorResponse('Echec mise a jour du profil', 'DATABASE_ERROR', flagError)
  }

  return successResponse({ ok: true })
}
