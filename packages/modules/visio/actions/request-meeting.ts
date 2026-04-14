'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type MeetingRequest, type MeetingRequestDB, RequestMeetingInput } from '../types/meeting-request.types'
import { toMeetingRequest } from '../utils/to-meeting-request'

export async function requestMeeting(
  input: { operatorId: string; requestedSlots: string[]; message?: string }
): Promise<ActionResponse<MeetingRequest>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = RequestMeetingInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Resolve client_id from auth user
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!client) {
      return errorResponse('Client non trouvé', 'NOT_FOUND')
    }

    const { data, error } = await supabase
      .from('meeting_requests')
      .insert({
        client_id: client.id,
        operator_id: parsed.data.operatorId,
        requested_slots: parsed.data.requestedSlots,
        message: parsed.data.message ?? null,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[VISIO:REQUEST_MEETING] DB insert error:', error)
      return errorResponse('Erreur lors de la création de la demande', 'DB_ERROR', error)
    }

    // Notification MiKL (best-effort)
    await supabase.from('notifications').insert({
      recipient_id: parsed.data.operatorId,
      type: 'meeting_request',
      title: 'Nouvelle demande de visio',
      message: `Un client demande un rendez-vous visio.`,
      metadata: { requestId: (data as MeetingRequestDB).id },
    }).catch((err: unknown) => {
      console.error('[VISIO:REQUEST_MEETING] Notification error (non-blocking):', err)
    })

    return successResponse(toMeetingRequest(data as MeetingRequestDB))
  } catch (error) {
    console.error('[VISIO:REQUEST_MEETING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
