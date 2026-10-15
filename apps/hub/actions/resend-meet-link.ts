'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { sendEmail } from '@monprojetpro/modules-email'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'
import { buildMeetInvitationBody, buildMeetInvitationHtml } from '../lib/meet-invitation'

/**
 * Renvoyer le lien d'une visio déjà créée — T-056.
 *
 * Demande de MiKL : *« renvoyer le mail si jamais le client l'a perdu »*.
 *
 * 🔑 AUCUNE NOUVELLE SALLE N'EST CRÉÉE. On renvoie le lien EXISTANT : en
 * générer un autre invaliderait silencieusement celui que le client a peut-être
 * déjà noté, et il se présenterait dans une salle vide.
 *
 * ⚠️ CHAQUE ENVOI LAISSE SA TRACE (`invite_last_sent_at/_to/_count`) et
 * l'interface l'affiche. Sans cela, « renvoyer » se ferait à l'aveugle et on
 * enverrait deux fois le même lien sans le savoir — l'erreur exacte commise sur
 * les factures (T-044a).
 */

const ResendMeetLinkInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
  recipientEmail: z.string().email('Adresse email invalide'),
  message: z.string().optional(),
})

export interface ResendMeetLinkResult {
  recipientEmail: string
  sentCount: number
}

export async function resendMeetLink(input: {
  meetingId: string
  recipientEmail: string
  message?: string
}): Promise<ActionResponse<ResendMeetLinkResult>> {
  try {
    const parsed = ResendMeetLinkInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: meeting, error: findError } = await supabase
      .from('meetings')
      .select('id, title, status, scheduled_at, meet_uri, client_id, invite_sent_count')
      .eq('id', parsed.data.meetingId)
      .maybeSingle()

    if (findError || !meeting) {
      return errorResponse('Rendez-vous introuvable', 'NOT_FOUND')
    }

    if (!meeting.meet_uri) {
      return errorResponse(
        "Ce rendez-vous n'a pas de lien de visio — il n'y a rien à renvoyer.",
        'NO_MEET_LINK'
      )
    }

    if (meeting.status === 'cancelled') {
      return errorResponse(
        "Ce rendez-vous est annulé : renvoyer son lien ferait venir le client à un rendez-vous qui n'aura pas lieu.",
        'MEETING_CANCELLED'
      )
    }

    if (meeting.status === 'completed') {
      return errorResponse('Ce rendez-vous a déjà eu lieu.', 'MEETING_COMPLETED')
    }

    // Le destinataire doit appartenir au client — même garde que l'envoi
    // initial : sans elle, le Hub relaierait un email vers une adresse
    // arbitraire depuis la boîte Gmail de MonprojetPro.
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, company, email')
      .eq('id', meeting.client_id as string)
      .maybeSingle()

    if (!client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    const { data: contactRows } = await supabase
      .from('client_contacts')
      .select('email')
      .eq('client_id', client.id as string)

    const allowed = new Set<string>()
    if (client.email) allowed.add((client.email as string).toLowerCase())
    for (const row of contactRows ?? []) {
      if (row.email) allowed.add((row.email as string).toLowerCase())
    }

    if (!allowed.has(parsed.data.recipientEmail.toLowerCase())) {
      return errorResponse(
        "Cette adresse n'appartient pas à ce client. Ajoute-la à son carnet de contacts avant de lui renvoyer le lien.",
        'RECIPIENT_NOT_ALLOWED'
      )
    }

    const invitation = {
      clientName: (client.name as string) || (client.company as string) || 'Bonjour',
      title: meeting.title as string,
      meetUri: meeting.meet_uri as string,
      ...(meeting.scheduled_at ? { scheduledAt: meeting.scheduled_at as string } : {}),
      ...(parsed.data.message ? { message: parsed.data.message } : {}),
    }

    const emailRes = await sendEmail({
      to: parsed.data.recipientEmail,
      subject: `Visio MonprojetPro — ${meeting.title}`,
      body: buildMeetInvitationBody(invitation),
      html: buildMeetInvitationHtml(invitation),
    })

    if (emailRes.error) {
      return errorResponse(
        `L'email n'a pas pu être envoyé : ${emailRes.error.message}. Le lien reste disponible, tu peux le copier et le transmettre à la main.`,
        'EMAIL_ERROR'
      )
    }

    const sentCount = ((meeting.invite_sent_count as number) ?? 0) + 1

    // ⚠️ La trace s'écrit APRÈS l'envoi réussi seulement : dater un envoi qui
    // a échoué ferait croire le client prévenu.
    const { error: traceError } = await supabase
      .from('meetings')
      .update({
        invite_last_sent_at: new Date().toISOString(),
        invite_last_sent_to: parsed.data.recipientEmail,
        invite_sent_count: sentCount,
      })
      .eq('id', parsed.data.meetingId)

    if (traceError) {
      // L'email EST parti : on ne dit pas le contraire. Mais on signale que la
      // trace manque, plutôt que de la taire (leçon T-041b : un échec de miroir
      // silencieux rend une garde inopérante sans que personne ne le voie).
      console.error('[HUB:RESEND_MEET_LINK] Trace non enregistrée:', traceError)
      return successResponse({ recipientEmail: parsed.data.recipientEmail, sentCount: 0 })
    }

    return successResponse({ recipientEmail: parsed.data.recipientEmail, sentCount })
  } catch (error) {
    console.error('[HUB:RESEND_MEET_LINK] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
