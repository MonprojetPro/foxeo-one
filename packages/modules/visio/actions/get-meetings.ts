'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type Meeting, type MeetingDB, GetMeetingsInput } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'

export async function getMeetings(
  input: { clientId?: string; status?: string }
): Promise<ActionResponse<Meeting[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetMeetingsInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    let query = supabase
      .from('meetings')
      .select('*')

    if (parsed.data.clientId) {
      query = query.eq('client_id', parsed.data.clientId) as typeof query
    }

    if (parsed.data.status) {
      query = query.eq('status', parsed.data.status) as typeof query
    }

    const { data, error } = await query.order('scheduled_at', { ascending: false })

    if (error) {
      console.error('[VISIO:GET_MEETINGS] DB error:', error)
      return errorResponse('Erreur lors de la récupération des meetings', 'DB_ERROR', error)
    }

    return successResponse((data as MeetingDB[]).map(toMeeting))
  } catch (error) {
    console.error('[VISIO:GET_MEETINGS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
