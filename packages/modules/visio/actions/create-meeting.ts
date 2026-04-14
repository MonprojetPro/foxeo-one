'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type Meeting, type MeetingDB, CreateMeetingInput } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'

export async function createMeeting(
  input: { clientId: string; operatorId: string; title: string; description?: string; scheduledAt?: string }
): Promise<ActionResponse<Meeting>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = CreateMeetingInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        client_id: parsed.data.clientId,
        operator_id: parsed.data.operatorId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        scheduled_at: parsed.data.scheduledAt ?? null,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[VISIO:CREATE_MEETING] DB insert error:', error)
      return errorResponse('Erreur lors de la création du meeting', 'DB_ERROR', error)
    }

    // Résoudre auth_user_id du client pour la notification
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', parsed.data.clientId)
      .single()

    // Notification au destinataire (best-effort — ne bloque pas)
    if (clientRecord?.auth_user_id) {
      await supabase.from('notifications').insert({
        recipient_id: clientRecord.auth_user_id,
        type: 'meeting_scheduled',
        title: 'Nouveau meeting planifié',
        message: `Un meeting "${parsed.data.title}" a été planifié.`,
        metadata: { meetingId: (data as MeetingDB).id },
      }).catch((err) => {
        console.error('[VISIO:CREATE_MEETING] Notification error (non-blocking):', err)
      })
    }

    return successResponse(toMeeting(data as MeetingDB))
  } catch (error) {
    console.error('[VISIO:CREATE_MEETING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
