'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type Meeting, type MeetingDB, CreateMeetingInput } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'

export async function createMeeting(
  input: {
    clientId?: string
    operatorId: string
    title: string
    description?: string
    scheduledAt?: string
    meetSpaceName?: string
    meetUri?: string
    isFree?: boolean
    priceCents?: number
  }
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

    // T-059 — une séance « payante » sans montant n'est pas une dette, c'est un
    // oubli de saisie. On refuse plutôt que de créer un billable_items à 0 €,
    // introuvable et jamais facturable.
    const isFree = parsed.data.isFree ?? true
    if (!isFree && (!parsed.data.priceCents || parsed.data.priceCents <= 0)) {
      return errorResponse(
        'Un montant est requis pour une séance payante',
        'VALIDATION_ERROR'
      )
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        client_id: parsed.data.clientId ?? null,
        operator_id: parsed.data.operatorId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        scheduled_at: parsed.data.scheduledAt ?? null,
        meet_space_name: parsed.data.meetSpaceName ?? null,
        meet_uri: parsed.data.meetUri ?? null,
        is_free: isFree,
        price_cents: isFree ? null : parsed.data.priceCents,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[VISIO:CREATE_MEETING] DB insert error:', error)
      return errorResponse('Erreur lors de la création du meeting', 'DB_ERROR', error)
    }

    // T-059 — séance payante → ligne de dette (billable_items), même table que
    // le coaching One+ hors forfait pour que l'écran de dette du Hub n'ait
    // qu'une seule source à lire. Best-effort : un échec ici ne doit pas
    // détruire le meeting déjà créé, mais DOIT être tracé fort — une dette
    // perdue en silence est pire qu'une séance non facturée explicitement.
    if (!isFree && parsed.data.clientId) {
      const { error: billableError } = await supabase.from('billable_items').insert({
        client_id: parsed.data.clientId,
        item_type: 'visio_session',
        label: `Visio du ${new Date(parsed.data.scheduledAt ?? new Date().toISOString()).toLocaleDateString('fr-FR')} — ${parsed.data.title}`,
        amount_cents: parsed.data.priceCents,
        status: 'pending',
        meeting_id: data.id as string,
      })
      if (billableError) {
        console.error('[VISIO:CREATE_MEETING] billable_items insert error (meeting créé, dette NON enregistrée):', billableError)
      }
    }

    // Résoudre auth_user_id du client pour la notification
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', parsed.data.clientId)
      .single()

    // Notification au destinataire (best-effort — ne bloque pas)
    // Shape corrigée (chantier 2026-07-06) : recipient_type/body/link requis, et type 'system'
    // ('meeting_scheduled' n'est pas dans la CHECK notifications_type_check → notif perdue).
    if (clientRecord?.auth_user_id) {
      const { error: notifError } = await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: clientRecord.auth_user_id,
        type: 'system',
        title: 'Nouveau meeting planifié',
        body: `Un meeting "${parsed.data.title}" a été planifié.`,
        link: '/modules/visio',
      })
      if (notifError) {
        console.error('[VISIO:CREATE_MEETING] Notification error (non-blocking):', notifError)
      }
    }

    return successResponse(toMeeting(data as MeetingDB))
  } catch (error) {
    console.error('[VISIO:CREATE_MEETING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
