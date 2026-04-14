'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import {
  CreateTicketInputSchema,
  type SupportTicket,
  type SupportTicketDB,
} from '../types/support.types'

export async function createSupportTicket(
  input: { type: string; subject: string; description: string; screenshotUrl?: string | null }
): Promise<ActionResponse<SupportTicket>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, operator_id, name')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Client non trouvé', 'NOT_FOUND')
    }

    // Validate input
    const parsed = CreateTicketInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { type, subject, description, screenshotUrl } = parsed.data

    // Create ticket
    const { data: ticketData, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        client_id: client.id,
        operator_id: client.operator_id,
        type,
        subject,
        description,
        screenshot_url: screenshotUrl ?? null,
      })
      .select()
      .single()

    if (insertError || !ticketData) {
      console.error('[SUPPORT:CREATE_TICKET] Insert error:', insertError)
      return errorResponse('Impossible de créer le signalement', 'DB_ERROR', insertError)
    }

    // Notify MiKL (operator) — non-blocking, log on failure
    const { error: notifError } = await supabase.from('notifications').insert({
      recipient_type: 'operator',
      recipient_id: client.operator_id,
      type: 'alert',
      title: `Nouveau signalement de ${client.name}`,
      body: `${type}: ${subject}`,
      link: `/modules/crm/clients/${client.id}?tab=support`,
    })
    if (notifError) {
      console.warn('[SUPPORT:CREATE_TICKET] Notification failed (non-blocking):', notifError)
    }

    const ticket = toCamelCase<SupportTicketDB, SupportTicket>(ticketData as SupportTicketDB)

    return successResponse(ticket)
  } catch (error) {
    console.error('[SUPPORT:CREATE_TICKET] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
