'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '@monprojetpro/types'
import { DEFAULT_COMMUNICATION_PROFILE } from '@monprojetpro/utils'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Compile toutes les observations Lab d'un client en lab_learnings.
 * Appeler lors de la graduation Lab → One (Epic 9, FR68).
 *
 * Récupère les messages elio_messages[dashboard_type='lab'] avec profile_observation,
 * les compile dans communication_profile.lab_learnings,
 * et sauvegarde dans client_configs.elio_config.
 */
export async function compileLabLearnings(
  clientId: string
): Promise<ActionResponse<CommunicationProfile>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    // Récupérer toutes les observations Lab
    const { data: messages, error: messagesError } = await supabase
      .from('elio_messages')
      .select('metadata')
      .eq('client_id', clientId)
      .eq('dashboard_type', 'lab')
      .not('metadata->profile_observation', 'is', null)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('[ELIO:COMPILE_LAB_LEARNINGS] Fetch messages error:', messagesError)
      return errorResponse('Erreur lors de la récupération des observations', 'DATABASE_ERROR', messagesError)
    }

    const labLearnings = (messages ?? [])
      .filter((m) => {
        const meta = m.metadata as Record<string, unknown>
        return !!meta?.profile_observation
      })
      .map((m) => String((m.metadata as Record<string, unknown>).profile_observation))

    // Récupérer la config actuelle
    const { data: currentConfig, error: fetchError } = await supabase
      .from('client_configs')
      .select('elio_config')
      .eq('client_id', clientId)
      .single()

    if (fetchError || !currentConfig) {
      console.error('[ELIO:COMPILE_LAB_LEARNINGS] Config not found:', fetchError)
      return errorResponse('Configuration client non trouvée', 'NOT_FOUND', fetchError)
    }

    const currentElioConfig = (currentConfig.elio_config as Record<string, unknown>) ?? {}
    const currentProfile = (currentElioConfig.communication_profile as CommunicationProfile) ?? {
      ...DEFAULT_COMMUNICATION_PROFILE,
    }

    const updatedProfile: CommunicationProfile = {
      ...currentProfile,
      lab_learnings: labLearnings,
    }

    const updatedElioConfig = {
      ...currentElioConfig,
      communication_profile: updatedProfile,
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ elio_config: updatedElioConfig })
      .eq('client_id', clientId)

    if (updateError) {
      console.error('[ELIO:COMPILE_LAB_LEARNINGS] Update error:', updateError)
      return errorResponse('Erreur lors de la compilation des learnings', 'DATABASE_ERROR', updateError)
    }

    return successResponse(updatedProfile)
  } catch (error) {
    console.error('[ELIO:COMPILE_LAB_LEARNINGS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
