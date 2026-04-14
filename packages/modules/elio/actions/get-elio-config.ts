'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  type ElioConfig,
  type ElioConfigDB,
  DEFAULT_ELIO_CONFIG,
  toElioConfig,
} from '../types/elio-config.types'

/**
 * Récupère la config Élio du client. Si clientId fourni, skip l'auth lookup.
 */
export async function getElioConfig(
  clientId?: string
): Promise<ActionResponse<ElioConfig>> {
  const supabase = await createServerSupabaseClient()

  let resolvedClientId = clientId

  if (!resolvedClientId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
    }

    resolvedClientId = client.id
  }

  const { data: config, error: configError } = await supabase
    .from('elio_configs')
    .select('*')
    .eq('client_id', resolvedClientId)
    .maybeSingle()

  if (configError) {
    console.error('[ELIO:GET_CONFIG] Error:', configError)
    return errorResponse('Erreur récupération config', 'DB_ERROR', configError)
  }

  // Si config inexistante → retourner defaults
  if (!config) {
    return successResponse(DEFAULT_ELIO_CONFIG)
  }

  return successResponse(toElioConfig(config as ElioConfigDB))
}
