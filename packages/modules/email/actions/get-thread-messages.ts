'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { getValidAccessToken, fetchThreadMessages } from '../utils/gmail-api'
import type { EmailMessage } from '../types/email.types'

export async function getThreadMessages(threadId: string): Promise<ActionResponse<EmailMessage[]>> {
  if (!threadId) return errorResponse('threadId requis', 'VALIDATION_ERROR')

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'AUTH_ERROR')

  const { data: integration } = await supabase
    .from('gmail_integrations')
    .select('gmail_email')
    .eq('operator_id', user.id)
    .maybeSingle()

  if (!integration) return errorResponse('Gmail non connecté', 'AUTH_ERROR')

  const accessToken = await getValidAccessToken(supabase, user.id)
  if (!accessToken) return errorResponse('Token Gmail invalide', 'AUTH_ERROR')

  try {
    const messages = await fetchThreadMessages(accessToken, threadId, integration.gmail_email)
    return successResponse(messages)
  } catch (err) {
    return errorResponse('Erreur lors de la récupération du fil', 'FETCH_ERROR', err)
  }
}
