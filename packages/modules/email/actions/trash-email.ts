'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { getValidAccessToken, trashGmailThread } from '../utils/gmail-api'

export async function trashEmail(threadId: string): Promise<ActionResponse<void>> {
  if (!threadId) return errorResponse('threadId requis', 'VALIDATION_ERROR')

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'AUTH_ERROR')

  const accessToken = await getValidAccessToken(supabase, user.id)
  if (!accessToken) return errorResponse('Token Gmail invalide', 'AUTH_ERROR')

  try {
    const ok = await trashGmailThread(accessToken, threadId)
    if (!ok) return errorResponse('Impossible de supprimer le thread', 'TRASH_ERROR')
    return successResponse(undefined)
  } catch (err) {
    return errorResponse('Erreur lors de la suppression', 'TRASH_ERROR', err)
  }
}
