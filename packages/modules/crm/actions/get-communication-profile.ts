'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '@monprojetpro/types'
import { communicationProfileSchema, DEFAULT_COMMUNICATION_PROFILE } from '@monprojetpro/utils'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Récupère le profil de communication d'un client depuis client_configs.elio_config.
 * Accessible uniquement par l'opérateur (MiKL) depuis le Hub.
 */
export async function getClientCommunicationProfile(
  clientId: string
): Promise<ActionResponse<CommunicationProfile>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const { data: config, error: fetchError } = await supabase
      .from('client_configs')
      .select('elio_config')
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .single()

    if (fetchError || !config) {
      return successResponse(DEFAULT_COMMUNICATION_PROFILE)
    }

    const elioConfig = (config.elio_config as Record<string, unknown>) ?? {}
    const rawProfile = elioConfig.communication_profile

    if (!rawProfile) {
      return successResponse(DEFAULT_COMMUNICATION_PROFILE)
    }

    const parsed = communicationProfileSchema.safeParse(rawProfile)
    if (!parsed.success) {
      return successResponse(DEFAULT_COMMUNICATION_PROFILE)
    }

    return successResponse(parsed.data as CommunicationProfile)
  } catch (error) {
    console.error('[CRM:GET_COMM_PROFILE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
