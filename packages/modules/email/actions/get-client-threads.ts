'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { getValidAccessToken, fetchClientThreads } from '../utils/gmail-api'
import type { EmailThread } from '../types/email.types'

export async function getClientThreads(clientId: string): Promise<ActionResponse<EmailThread[]>> {
  if (!clientId) return errorResponse('clientId requis', 'VALIDATION_ERROR')

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'AUTH_ERROR')

  // Récupérer l'email du client
  const { data: client } = await supabase
    .from('clients')
    .select('email')
    .eq('id', clientId)
    .maybeSingle()

  if (!client?.email) return errorResponse('Client introuvable', 'NOT_FOUND')

  // Access token valide
  const accessToken = await getValidAccessToken(supabase, user.id)
  if (!accessToken) return errorResponse('Gmail non connecté', 'AUTH_ERROR')

  try {
    const threads = await fetchClientThreads(accessToken, client.email)
    return successResponse(threads)
  } catch (err) {
    return errorResponse('Erreur lors de la récupération des emails', 'FETCH_ERROR', err)
  }
}
