'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

export interface ElioObservation {
  messageId: string
  observation: string
  createdAt: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Récupère les observations de profil détectées par Élio Lab pour un client.
 * Les observations sont stockées dans elio_messages.metadata.profile_observation
 * AC: 8.4 #3
 */
export async function getElioObservations(
  clientId: string
): Promise<ActionResponse<ElioObservation[]>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Récupérer les messages Lab du client avec une observation
    const { data: messages, error: messagesError } = await supabase
      .from('elio_messages')
      .select('id, metadata, created_at')
      .eq('client_id', clientId)
      .eq('dashboard_type', 'lab')
      .not('metadata->profile_observation', 'is', null)
      .order('created_at', { ascending: false })

    if (messagesError) {
      console.error('[CRM:GET_ELIO_OBS] Fetch error:', messagesError)
      return errorResponse('Erreur lors de la récupération des observations', 'DATABASE_ERROR', messagesError)
    }

    const observations: ElioObservation[] = (messages ?? [])
      .filter((m) => {
        const meta = m.metadata as Record<string, unknown>
        return meta?.profile_observation
      })
      .map((m) => ({
        messageId: m.id,
        observation: String((m.metadata as Record<string, unknown>).profile_observation),
        createdAt: m.created_at,
      }))

    return successResponse(observations)
  } catch (error) {
    console.error('[CRM:GET_ELIO_OBS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
