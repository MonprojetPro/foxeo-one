'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { SupportTicket, SupportTicketDB } from '../types/support.types'

export async function getSupportTickets(options?: {
  clientId?: string
  limit?: number
}): Promise<ActionResponse<SupportTicket[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 100)

    // If clientId provided (Hub view), filter by client
    if (options?.clientId) {
      query = query.eq('client_id', options.clientId)
    }

    // RLS handles visibility: client sees own, operator sees own clients'
    const { data, error } = await query

    if (error) {
      console.error('[SUPPORT:GET_TICKETS] Query error:', error)
      return errorResponse('Impossible de récupérer les signalements', 'DB_ERROR', error)
    }

    const tickets = (data ?? []).map((row) =>
      toCamelCase<SupportTicketDB, SupportTicket>(row as SupportTicketDB)
    )

    return successResponse(tickets)
  } catch (error) {
    console.error('[SUPPORT:GET_TICKETS] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
