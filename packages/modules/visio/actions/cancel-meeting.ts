'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'
import { type Meeting, type MeetingDB } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'

/**
 * Annuler un rendez-vous de visio — T-056.
 *
 * 🔑 ON ANNULE, ON NE SUPPRIME PAS (tranché avec MiKL le 2026-10-15).
 * Un rendez-vous a pu être envoyé à un client, démarré, enregistré. L'effacer
 * ferait disparaître la trace d'un échange qui a peut-être eu lieu — et
 * l'historique des appels est précisément ce que MiKL a demandé. Le rendez-vous
 * reste donc visible, marqué « Annulé ».
 *
 * ⚠️ Un rendez-vous DÉJÀ TERMINÉ ne s'annule pas : on ne réécrit pas le passé.
 * Seul ce qui n'a pas encore eu lieu peut être annulé.
 */

const CancelMeetingInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
})

export async function cancelMeeting(input: {
  meetingId: string
}): Promise<ActionResponse<Meeting>> {
  try {
    const parsed = CancelMeetingInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: existing, error: findError } = await supabase
      .from('meetings')
      .select('id, status')
      .eq('id', parsed.data.meetingId)
      .maybeSingle()

    if (findError || !existing) {
      return errorResponse('Rendez-vous introuvable', 'NOT_FOUND')
    }

    if (existing.status === 'completed') {
      return errorResponse(
        "Ce rendez-vous a déjà eu lieu — il ne peut plus être annulé. L'historique garde la trace de ce qui s'est passé.",
        'ALREADY_COMPLETED'
      )
    }

    if (existing.status === 'cancelled') {
      return errorResponse('Ce rendez-vous est déjà annulé.', 'ALREADY_CANCELLED')
    }

    const { data, error } = await supabase
      .from('meetings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', parsed.data.meetingId)
      .select()
      .single()

    if (error || !data) {
      console.error('[VISIO:CANCEL_MEETING] DB error:', error)
      return errorResponse("Erreur lors de l'annulation du rendez-vous", 'DB_ERROR', error)
    }

    // T-059 — une séance payante annulée AVANT facturation n'est plus une
    // dette. Si elle a déjà été facturée (status != 'pending'), on ne touche
    // à rien : la facture existe, c'est un avoir qu'il faut faire, pas ce
    // chantier. Best-effort, non bloquant (même doctrine que le reste du module).
    const { error: billableCancelError } = await supabase
      .from('billable_items')
      .update({ status: 'cancelled' })
      .eq('meeting_id', parsed.data.meetingId)
      .eq('status', 'pending')
    if (billableCancelError) {
      console.error('[VISIO:CANCEL_MEETING] billable_items cancel error (non-blocking):', billableCancelError)
    }

    return successResponse(toMeeting(data as MeetingDB))
  } catch (error) {
    console.error('[VISIO:CANCEL_MEETING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
