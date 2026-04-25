'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { ClientExchange as ClientExchangeSchema } from '../types/crm.types'
import type { ClientExchange } from '../types/crm.types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getClientExchanges(
  clientId: string
): Promise<ActionResponse<ClientExchange[]>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Query 1 : messages du chat MiKL-client (colonne sender_type, pas type)
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id, client_id, sender_type, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(15)

    if (messagesError && messagesError.code !== '42P01') {
      console.error('[CRM:GET_CLIENT_EXCHANGES] Messages error:', messagesError)
      return errorResponse('Impossible de charger les messages', 'DATABASE_ERROR', messagesError)
    }

    // Query 2 : escalades Élio pour ce client (notifications elio_escalation dont le link contient le clientId)
    const { data: escalationsData } = await supabase
      .from('notifications')
      .select('id, title, body, created_at')
      .eq('type', 'elio_escalation')
      .eq('recipient_id', user.id)
      .like('link', `%${clientId}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    // Map messages → ClientExchange
    const messageExchanges: ClientExchange[] = (messagesData ?? []).map((msg) =>
      ClientExchangeSchema.parse({
        id: msg.id,
        clientId: msg.client_id,
        type: 'message',
        content: msg.content,
        createdAt: msg.created_at,
      })
    )

    // Map escalades Élio → ClientExchange
    const escalationExchanges: ClientExchange[] = (escalationsData ?? []).map((notif) =>
      ClientExchangeSchema.parse({
        id: notif.id,
        clientId: clientId,
        type: 'elio_escalation',
        content: notif.body ?? notif.title ?? 'Question escaladée',
        createdAt: notif.created_at,
      })
    )

    // Fusion, tri par date desc, limite à 20
    const exchanges = [...messageExchanges, ...escalationExchanges]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)

    return successResponse(exchanges)
  } catch (error) {
    console.error('[CRM:GET_CLIENT_EXCHANGES] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
