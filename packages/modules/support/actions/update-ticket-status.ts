'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import {
  UpdateTicketStatusSchema,
  type SupportTicket,
  type SupportTicketDB,
  type UpdateTicketStatusInput,
  type TicketStatus,
} from '../types/support.types'

// Message transmis au client à chaque changement de statut (décision MiKL : à chaque transition).
// type ∈ liste CHECK notifications : 'info' | 'success' | 'system' tous autorisés.
const STATUS_NOTIFICATION: Record<
  TicketStatus,
  { type: string; title: string; body: (subject: string) => string }
> = {
  open: {
    type: 'info',
    title: 'Signalement rouvert',
    body: (s) => `Votre signalement « ${s} » a été rouvert. Nous le reprenons en main.`,
  },
  in_progress: {
    type: 'info',
    title: 'Signalement pris en charge',
    body: (s) =>
      `Bonne nouvelle : nous avons pris en charge votre signalement « ${s} » et nous travaillons dessus.`,
  },
  resolved: {
    type: 'success',
    title: 'Signalement résolu',
    body: (s) =>
      `Votre signalement « ${s} » a été résolu. Si ce n'est pas tout à fait réglé, n'hésitez pas à nous solliciter à nouveau.`,
  },
  closed: {
    type: 'system',
    title: 'Signalement clôturé',
    body: (s) =>
      `Votre signalement « ${s} » est clôturé. Merci de votre confiance — vous pouvez ouvrir un nouveau signalement à tout moment.`,
  },
}

export async function updateTicketStatus(
  input: UpdateTicketStatusInput
): Promise<ActionResponse<SupportTicket>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Validate input
    const parsed = UpdateTicketStatusSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { ticketId, status } = parsed.data

    // Lookup operator record
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Récupérer le statut actuel pour ne notifier que sur un vrai changement
    const { data: existing } = await supabase
      .from('support_tickets')
      .select('status')
      .eq('id', ticketId)
      .eq('operator_id', operator.id)
      .single()

    const previousStatus = existing?.status as TicketStatus | undefined

    // Update status — RLS ensures operator owns this ticket
    const { data: ticketData, error: updateError } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', ticketId)
      .eq('operator_id', operator.id)
      .select()
      .single()

    if (updateError || !ticketData) {
      console.error('[SUPPORT:UPDATE_STATUS] Update error:', updateError)
      return errorResponse('Impossible de mettre à jour le statut', 'DB_ERROR', updateError)
    }

    const ticket = toCamelCase<SupportTicketDB, SupportTicket>(ticketData as SupportTicketDB)

    // Notifier le client du changement de statut — non-bloquant, log en cas d'échec.
    // Communication inter-module via la table notifications (jamais d'import direct du module).
    if (previousStatus !== status) {
      const { data: client } = await supabase
        .from('clients')
        .select('auth_user_id')
        .eq('id', ticket.clientId)
        .single()

      if (client?.auth_user_id) {
        const message = STATUS_NOTIFICATION[status]
        const { error: notifError } = await supabase.from('notifications').insert({
          recipient_type: 'client',
          recipient_id: client.auth_user_id,
          type: message.type,
          title: message.title,
          body: message.body(ticket.subject),
          link: '/support',
        })
        if (notifError) {
          console.warn('[SUPPORT:UPDATE_STATUS] Notification client échouée (non-bloquant):', notifError)
        }
      }
    }

    console.log(`[SUPPORT:UPDATE_STATUS] Ticket ${ticketId} → ${status}`)

    return successResponse(ticket)
  } catch (error) {
    console.error('[SUPPORT:UPDATE_STATUS] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
