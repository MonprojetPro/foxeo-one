'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '@monprojetpro/types'
import { DEFAULT_COMMUNICATION_PROFILE } from '@monprojetpro/utils'

export type ObservationTarget = 'avoid' | 'privilege' | 'styleNotes'

export interface IntegrateObservationInput {
  clientId: string
  observation: string
  target: ObservationTarget
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Intègre une observation Élio Lab dans le profil officiel de communication.
 * Ajoute l'observation dans avoid, privilege, ou styleNotes selon la cible.
 * AC: 8.4 #3
 */
export async function integrateObservation(
  input: IntegrateObservationInput
): Promise<ActionResponse<CommunicationProfile>> {
  try {
    const { clientId, observation, target } = input

    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    if (!observation.trim()) {
      return errorResponse('L\'observation ne peut pas être vide', 'INVALID_INPUT')
    }

    if (!['avoid', 'privilege', 'styleNotes'].includes(target)) {
      return errorResponse('Cible invalide', 'INVALID_INPUT')
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

    // Récupérer la config actuelle
    const { data: currentConfig, error: fetchError } = await supabase
      .from('client_configs')
      .select('elio_config')
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .single()

    if (fetchError || !currentConfig) {
      console.error('[CRM:INTEGRATE_OBS] Config not found:', fetchError)
      return errorResponse('Configuration client non trouvée', 'NOT_FOUND', fetchError)
    }

    const currentElioConfig = (currentConfig.elio_config as Record<string, unknown>) ?? {}
    const currentProfile = (currentElioConfig.communication_profile as CommunicationProfile) ?? {
      ...DEFAULT_COMMUNICATION_PROFILE,
    }

    // Intégrer l'observation selon la cible
    let updatedProfile: CommunicationProfile
    if (target === 'avoid') {
      updatedProfile = {
        ...currentProfile,
        avoid: [...(currentProfile.avoid ?? []), observation.trim()],
      }
    } else if (target === 'privilege') {
      updatedProfile = {
        ...currentProfile,
        privilege: [...(currentProfile.privilege ?? []), observation.trim()],
      }
    } else {
      const existing = currentProfile.styleNotes ?? ''
      updatedProfile = {
        ...currentProfile,
        styleNotes: existing
          ? `${existing}\n${observation.trim()}`
          : observation.trim(),
      }
    }

    const updatedElioConfig = {
      ...currentElioConfig,
      communication_profile: updatedProfile,
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ elio_config: updatedElioConfig })
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)

    if (updateError) {
      console.error('[CRM:INTEGRATE_OBS] Update error:', updateError)
      return errorResponse('Erreur lors de l\'intégration de l\'observation', 'DATABASE_ERROR', updateError)
    }

    return successResponse(updatedProfile)
  } catch (error) {
    console.error('[CRM:INTEGRATE_OBS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
