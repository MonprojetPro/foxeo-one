'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'
import { type Meeting, type MeetingDB } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'

/**
 * Déplacer un rendez-vous — T-056.
 *
 * 🔑 LA SALLE N'EST PAS RECRÉÉE, ET C'EST TOUT L'INTÉRÊT. Le lien Meet a
 * peut-être déjà été envoyé au client ; en générer un nouveau le rendrait
 * caduc sans que personne ne le sache, et le client arriverait dans une salle
 * vide à la date convenue. On change la date, on garde le lien.
 *
 * ⚠️ Déplacer ne previent pas le client tout seul : la nouvelle date doit lui
 * être renvoyée. L'interface le signale, et `invite_last_sent_at` devient
 * antérieur à la nouvelle date — ce qui rend le renvoi nécessaire VISIBLE.
 */

const RescheduleMeetingInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
  scheduledAt: z.string().datetime({ offset: true }),
})

export async function rescheduleMeeting(input: {
  meetingId: string
  scheduledAt: string
}): Promise<ActionResponse<Meeting>> {
  try {
    const parsed = RescheduleMeetingInput.safeParse(input)
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
      .select('id, status, scheduled_at, metadata')
      .eq('id', parsed.data.meetingId)
      .maybeSingle()

    if (findError || !existing) {
      return errorResponse('Rendez-vous introuvable', 'NOT_FOUND')
    }

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return errorResponse(
        "Ce rendez-vous est terminé ou annulé — il ne peut plus être déplacé. Crée-en un nouveau.",
        'NOT_RESCHEDULABLE'
      )
    }

    // On garde d'où il vient : six mois plus tard, « pourquoi ce RDV a-t-il
    // bougé ? » ne doit pas rester sans réponse.
    const metadata = {
      ...((existing.metadata as Record<string, unknown>) ?? {}),
      rescheduledFrom: existing.scheduled_at,
    }

    const { data, error } = await supabase
      .from('meetings')
      .update({
        scheduled_at: parsed.data.scheduledAt,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.meetingId)
      .select()
      .single()

    if (error || !data) {
      console.error('[VISIO:RESCHEDULE_MEETING] DB error:', error)
      return errorResponse('Erreur lors du déplacement du rendez-vous', 'DB_ERROR', error)
    }

    return successResponse(toMeeting(data as MeetingDB))
  } catch (error) {
    console.error('[VISIO:RESCHEDULE_MEETING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
