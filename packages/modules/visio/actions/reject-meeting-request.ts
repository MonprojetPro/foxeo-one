'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type MeetingRequest, type MeetingRequestDB, RejectMeetingRequestInput } from '../types/meeting-request.types'
import { toMeetingRequest } from '../utils/to-meeting-request'

export async function rejectMeetingRequest(
  input: { requestId: string; reason?: string }
): Promise<ActionResponse<MeetingRequest>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = RejectMeetingRequestInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Fetch the request (RLS ensures operator owns it)
    const { data: request, error: fetchError } = await supabase
      .from('meeting_requests')
      .select('*')
      .eq('id', parsed.data.requestId)
      .single()

    if (fetchError || !request) {
      return errorResponse('Demande non trouvée', 'NOT_FOUND')
    }

    if ((request as MeetingRequestDB).status !== 'pending') {
      return errorResponse('Cette demande a déjà été traitée', 'CONFLICT')
    }

    const reqDB = request as MeetingRequestDB

    // Update request: rejected (preserve client's original message)
    const { data: updated, error: updateError } = await supabase
      .from('meeting_requests')
      .update({
        status: 'rejected',
      })
      .eq('id', parsed.data.requestId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('[VISIO:REJECT_REQUEST] Failed to update request:', updateError)
      return errorResponse('Erreur lors du refus de la demande', 'DB_ERROR', updateError)
    }

    // Notification client (best-effort)
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', reqDB.client_id)
      .single()

    if (clientRecord?.auth_user_id) {
      await supabase.from('notifications').insert({
        recipient_id: clientRecord.auth_user_id,
        type: 'meeting_request_rejected',
        title: 'Demande de visio refusée',
        message: parsed.data.reason ?? 'Votre demande de rendez-vous a été refusée.',
        metadata: { requestId: parsed.data.requestId },
      }).catch((err: unknown) => {
        console.error('[VISIO:REJECT_REQUEST] Notification error (non-blocking):', err)
      })
    }

    return successResponse(toMeetingRequest(updated as MeetingRequestDB))
  } catch (error) {
    console.error('[VISIO:REJECT_REQUEST] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
