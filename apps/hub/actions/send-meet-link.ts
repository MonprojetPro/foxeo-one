'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { createMeeting } from '@monprojetpro/module-visio'
import type { Meeting } from '@monprojetpro/module-visio'
import { sendEmail } from '@monprojetpro/modules-email'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'
import { createGoogleMeetSpace } from '../lib/google-meet-client'
import { buildMeetInvitationBody, buildMeetInvitationHtml } from '../lib/meet-invitation'
import { describeGoogleMeetFailure } from '../lib/google-meet-error'

/**
 * Envoyer un lien Google Meet à un client, depuis son dossier (Hub).
 *
 * 🔑 POURQUOI L'EMAIL EST LE CANAL PRINCIPAL, ET NON LA NOTIFICATION
 * (tranché par MiKL le 2026-10-11) : *« ça peut aussi être un client qui n'a pas
 * d'espace Lab ou One, quand c'est un client ponctuel »*. C'est le cas NORMAL,
 * pas l'exception — les clients ponctuels n'ont pas de `auth_user_id`, donc
 * aucune notification in-app ne leur parviendrait jamais. L'email part par
 * Gmail (compte de l'opérateur) pour que l'invitation apparaisse dans le fil de
 * l'onglet Emails du dossier client, ce qu'un envoi transactionnel ne ferait pas.
 * La notification in-app reste envoyée par `createMeeting` quand le client a un
 * espace — elle est un complément, jamais le canal unique.
 *
 * ⛔ PAS DE REPLI SILENCIEUX SUR GOOGLE MEET. `createHubMeeting` enveloppait
 * l'appel Google dans un catch qui créait le meeting SANS lien, sans rien dire —
 * MiKL croyait alors avoir envoyé un rendez-vous joignable qui ne l'était pas.
 * Ici, un échec Google est une erreur rendue à l'écran : pas de lien, pas de
 * meeting, pas d'email. On ne crée jamais une invitation vide.
 */

const SendMeetLinkInput = z.object({
  clientId: z.string().uuid('clientId invalide'),
  title: z.string().min(1, 'Le titre est requis'),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  /** Destinataire. Par défaut l'email du client ; peut être un contact du carnet. */
  recipientEmail: z.string().email('Adresse email invalide'),
  /** Mot libre ajouté avant le lien. */
  message: z.string().optional(),
})

export interface SendMeetLinkResult {
  meeting: Meeting
  meetUri: string
  recipientEmail: string
}

export async function sendMeetLink(input: {
  clientId: string
  title: string
  scheduledAt?: string
  recipientEmail: string
  message?: string
}): Promise<ActionResponse<SendMeetLinkResult>> {
  try {
    const parsed = SendMeetLinkInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // L'opérateur est identifié par auth_user_id, JAMAIS par l'email
    // (leçon `operateur-identifie-par-auth-user-id` : un .eq('email') qui ne
    // matche pas échoue sans lever d'erreur).
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (operatorError || !operator) {
      return errorResponse('Compte opérateur requis', 'FORBIDDEN')
    }

    // La RLS de `clients` filtre sur `is_operator(operator_id)` : un client qui
    // n'appartient pas à cet opérateur revient simplement introuvable.
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company, email')
      .eq('id', parsed.data.clientId)
      .maybeSingle()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // 🐕‍🦺 GARDE DE SÉCURITÉ : le destinataire doit APPARTENIR à ce client.
    // L'adresse arrive du navigateur ; sans ce contrôle, le Hub deviendrait un
    // relais capable d'envoyer un email à une adresse arbitraire depuis la boîte
    // Gmail de MonprojetPro — un vecteur d'hameçonnage portant notre domaine.
    // Les seules adresses légitimes sont celle de la fiche et celles du carnet.
    const { data: contactRows } = await supabase
      .from('client_contacts')
      .select('email')
      .eq('client_id', parsed.data.clientId)

    const allowedEmails = new Set<string>()
    if (client.email) allowedEmails.add((client.email as string).toLowerCase())
    for (const row of contactRows ?? []) {
      if (row.email) allowedEmails.add((row.email as string).toLowerCase())
    }

    if (!allowedEmails.has(parsed.data.recipientEmail.toLowerCase())) {
      return errorResponse(
        "Cette adresse n'appartient pas à ce client. Ajoute-la à son carnet de contacts avant de lui envoyer un lien de visio.",
        'RECIPIENT_NOT_ALLOWED'
      )
    }

    // 1. Salle Google Meet — ÉCHEC = ARRÊT, jamais de meeting sans lien
    let meetSpaceName: string | undefined
    let meetUri: string | undefined
    try {
      const space = await createGoogleMeetSpace()
      meetSpaceName = space.meetSpaceName
      meetUri = space.meetUri
    } catch (err) {
      // SONDE T-052 : le motif réel remonte jusqu'à l'écran. « Impossible de
      // créer la salle » ne disait pas s'il fallait poser un secret, régénérer
      // un jeton ou activer une API — trois réparations distinctes.
      const failure = describeGoogleMeetFailure(err)
      console.error(`[HUB:SEND_MEET_LINK] Google Meet ${failure.kind}:`, failure.detail)
      return errorResponse(failure.message, 'GOOGLE_MEET_ERROR', {
        kind: failure.kind,
        detail: failure.detail,
      })
    }

    if (!meetUri) {
      console.error('[HUB:SEND_MEET_LINK] Google Meet a répondu sans meetingUri')
      return errorResponse(
        "Google Meet n'a pas renvoyé de lien de visio. Aucun rendez-vous n'a été créé ni envoyé.",
        'GOOGLE_MEET_ERROR'
      )
    }

    // 2. Le meeting en base (notifie le client in-app s'il a un espace)
    const meetingRes = await createMeeting({
      clientId: parsed.data.clientId,
      operatorId: operator.id as string,
      title: parsed.data.title,
      ...(parsed.data.scheduledAt ? { scheduledAt: parsed.data.scheduledAt } : {}),
      meetSpaceName,
      meetUri,
    })

    if (meetingRes.error || !meetingRes.data) {
      return errorResponse(
        meetingRes.error?.message ?? 'Erreur lors de la création du rendez-vous',
        meetingRes.error?.code ?? 'DB_ERROR'
      )
    }

    // 3. L'email — le canal qui atteint AUSSI les clients sans espace
    const invitation = {
      clientName: (client.name as string) || (client.company as string) || 'Bonjour',
      title: parsed.data.title,
      meetUri,
      ...(parsed.data.scheduledAt ? { scheduledAt: parsed.data.scheduledAt } : {}),
      ...(parsed.data.message ? { message: parsed.data.message } : {}),
    }

    const emailRes = await sendEmail({
      to: parsed.data.recipientEmail,
      // Le tiret cadratin est volontaire : l'objet est désormais encodé en
      // RFC 2047 (T-057). Il s'affichait « Ã¢Â€Â" » avant ce correctif.
      subject: `Visio MonprojetPro — ${parsed.data.title}`,
      body: buildMeetInvitationBody(invitation),
      html: buildMeetInvitationHtml(invitation),
    })

    if (emailRes.error) {
      // Le rendez-vous EXISTE et porte son lien : on ne le détruit pas, mais on
      // dit clairement que l'email n'est pas parti — sinon MiKL croirait le
      // client prévenu (leçon T-046 : un envoi raté qui se tait est pire que
      // pas d'envoi).
      return errorResponse(
        `Le rendez-vous est créé avec son lien, mais l'email n'a pas pu être envoyé : ${emailRes.error.message}. Transmets le lien à la main, ou réessaie.`,
        'EMAIL_ERROR',
        { meetUri, meetingId: meetingRes.data.id }
      )
    }

    // Trace du premier envoi (T-056) — écrite seulement après succès, et sur le
    // MÊME modèle que le renvoi : si le premier envoi ne comptait pas, le
    // compteur démarrerait à 1 au deuxième et l'écran dirait « jamais envoyé »
    // sur un lien déjà parti.
    const { error: traceError } = await supabase
      .from('meetings')
      .update({
        invite_last_sent_at: new Date().toISOString(),
        invite_last_sent_to: parsed.data.recipientEmail,
        invite_sent_count: 1,
      })
      .eq('id', meetingRes.data.id)

    if (traceError) {
      console.error('[HUB:SEND_MEET_LINK] Trace non enregistrée:', traceError)
    }

    return successResponse({
      meeting: meetingRes.data,
      meetUri,
      recipientEmail: parsed.data.recipientEmail,
    })
  } catch (error) {
    console.error('[HUB:SEND_MEET_LINK] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
