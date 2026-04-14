'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type MeetingRequest, type MeetingRequestDB, GetMeetingRequestsInput } from '../types/meeting-request.types'
import { toMeetingRequest } from '../utils/to-meeting-request'

export async function getMeetingRequests(
  input: { status?: string }
): Promise<ActionResponse<MeetingRequest[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetMeetingRequestsInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    let query = supabase
      .from('meeting_requests')
      .select('*')

    if (parsed.data.status) {
      query = query.eq('status', parsed.data.status) as typeof query
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[VISIO:GET_MEETING_REQUESTS] DB error:', error)
      return errorResponse('Erreur lors de la récupération des demandes', 'DB_ERROR', error)
    }

    return successResponse((data as MeetingRequestDB[]).map(toMeetingRequest))
  } catch (error) {
    console.error('[VISIO:GET_MEETING_REQUESTS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
