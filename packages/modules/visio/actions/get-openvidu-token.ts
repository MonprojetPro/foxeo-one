'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type OpenViduTokenResult, GetOpenViduTokenInput } from '../types/meeting.types'

export async function getOpenViduToken(
  input: { meetingId: string }
): Promise<ActionResponse<OpenViduTokenResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetOpenViduTokenInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse('meetingId invalide', 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Appel à la Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('get-openvidu-token', {
      body: { meetingId: parsed.data.meetingId },
    })

    if (error || !data?.token) {
      console.error('[VISIO:GET_TOKEN] Edge Function error:', error)
      return errorResponse('Impossible d\'obtenir le token OpenVidu', 'OPENVIDU_ERROR', error)
    }

    return successResponse({ token: data.token, sessionId: data.sessionId })
  } catch (error) {
    console.error('[VISIO:GET_TOKEN] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
