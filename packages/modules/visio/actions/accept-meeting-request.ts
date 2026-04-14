'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type MeetingRequest, type MeetingRequestDB, AcceptMeetingRequestInput } from '../types/meeting-request.types'
import { toMeetingRequest } from '../utils/to-meeting-request'

export async function acceptMeetingRequest(
  input: { requestId: string; selectedSlot: string }
): Promise<ActionResponse<MeetingRequest>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = AcceptMeetingRequestInput.safeParse(input)
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

    // Validate selectedSlot is one of the requested slots
    const requestedSlots = reqDB.requested_slots as string[]
    if (!requestedSlots.includes(parsed.data.selectedSlot)) {
      return errorResponse('Le créneau sélectionné ne fait pas partie des créneaux proposés', 'VALIDATION_ERROR')
    }

    // Create meeting from accepted request
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        client_id: reqDB.client_id,
        operator_id: reqDB.operator_id,
        title: 'Consultation avec MiKL',
        scheduled_at: parsed.data.selectedSlot,
        status: 'scheduled',
      })
      .select()
      .single()

    if (meetingError || !meeting) {
      console.error('[VISIO:ACCEPT_REQUEST] Failed to create meeting:', meetingError)
      return errorResponse('Erreur lors de la création du meeting', 'DB_ERROR', meetingError)
    }

    // Update request: accepted with selected slot and meeting_id
    const { data: updated, error: updateError } = await supabase
      .from('meeting_requests')
      .update({
        status: 'accepted',
        selected_slot: parsed.data.selectedSlot,
        meeting_id: (meeting as Record<string, unknown>).id,
      })
      .eq('id', parsed.data.requestId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('[VISIO:ACCEPT_REQUEST] Failed to update request:', updateError)
      return errorResponse('Erreur lors de la mise à jour de la demande', 'DB_ERROR', updateError)
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
        type: 'meeting_scheduled',
        title: 'Demande de visio acceptée',
        message: `Votre rendez-vous avec MiKL est prévu le ${new Date(parsed.data.selectedSlot).toLocaleString('fr-FR')}`,
        metadata: { meetingId: (meeting as Record<string, unknown>).id, link: `/modules/visio/${(meeting as Record<string, unknown>).id}/lobby` },
      }).catch((err: unknown) => {
        console.error('[VISIO:ACCEPT_REQUEST] Notification error (non-blocking):', err)
      })
    }

    return successResponse(toMeetingRequest(updated as MeetingRequestDB))
  } catch (error) {
    console.error('[VISIO:ACCEPT_REQUEST] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
