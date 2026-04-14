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
} from '../types/support.types'

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

    console.log(`[SUPPORT:UPDATE_STATUS] Ticket ${ticketId} → ${status}`)

    return successResponse(ticket)
  } catch (error) {
    console.error('[SUPPORT:UPDATE_STATUS] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
