'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '@monprojetpro/types'
import { communicationProfileSchema } from '@monprojetpro/utils'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Met à jour le profil de communication dans client_configs.elio_config.communication_profile.
 * Utilisé par MiKL depuis la fiche client (Hub).
 * AC: 8.4 #2
 */
export async function updateCommunicationProfile(
  clientId: string,
  profile: CommunicationProfile
): Promise<ActionResponse<CommunicationProfile>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const parsed = communicationProfileSchema.safeParse(profile)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Vérifier que l'opérateur a accès à ce client
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Récupérer la config actuelle pour merger
    const { data: currentConfig, error: fetchError } = await supabase
      .from('client_configs')
      .select('elio_config')
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .single()

    if (fetchError || !currentConfig) {
      console.error('[CRM:UPDATE_COMM_PROFILE] Config not found:', fetchError)
      return errorResponse('Configuration client non trouvée', 'NOT_FOUND', fetchError)
    }

    const currentElioConfig = (currentConfig.elio_config as Record<string, unknown>) ?? {}
    const updatedElioConfig = {
      ...currentElioConfig,
      communication_profile: parsed.data,
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ elio_config: updatedElioConfig })
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)

    if (updateError) {
      console.error('[CRM:UPDATE_COMM_PROFILE] Update error:', updateError)
      return errorResponse('Erreur lors de la mise à jour du profil', 'DATABASE_ERROR', updateError)
    }

    return successResponse(parsed.data as CommunicationProfile)
  } catch (error) {
    console.error('[CRM:UPDATE_COMM_PROFILE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
