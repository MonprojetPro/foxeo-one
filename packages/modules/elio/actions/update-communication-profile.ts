'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  UpdateCommunicationProfileInput,
  toCommunicationProfile,
  type CommunicationProfile,
  type CommunicationProfileDB,
} from '../types/communication-profile.types'

export async function updateCommunicationProfile(
  input: UpdateCommunicationProfileInput
): Promise<ActionResponse<CommunicationProfile>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = UpdateCommunicationProfileInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Verify client belongs to authenticated user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', parsed.data.clientId)
      .single()

    if (clientError || !client) {
      console.error('[ELIO:UPDATE_PROFILE] Client not found:', clientError)
      return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
    }

    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.preferredTone !== undefined) updatePayload.preferred_tone = parsed.data.preferredTone
    if (parsed.data.preferredLength !== undefined) updatePayload.preferred_length = parsed.data.preferredLength
    if (parsed.data.interactionStyle !== undefined) updatePayload.interaction_style = parsed.data.interactionStyle
    if (parsed.data.contextPreferences !== undefined) updatePayload.context_preferences = parsed.data.contextPreferences

    if (Object.keys(updatePayload).length === 0) {
      // Nothing to update — fetch and return current profile
      const { data: existing, error: fetchError } = await supabase
        .from('communication_profiles')
        .select('*')
        .eq('client_id', parsed.data.clientId)
        .single()

      if (fetchError || !existing) {
        return errorResponse('Profil non trouvé', 'NOT_FOUND', fetchError)
      }
      return successResponse(toCommunicationProfile(existing as CommunicationProfileDB))
    }

    const { data: profile, error: updateError } = await supabase
      .from('communication_profiles')
      .update(updatePayload)
      .eq('client_id', parsed.data.clientId)
      .select()
      .single()

    if (updateError || !profile) {
      console.error('[ELIO:UPDATE_PROFILE] Update error:', updateError)
      return errorResponse('Erreur lors de la mise à jour du profil', 'DATABASE_ERROR', updateError)
    }

    return successResponse(toCommunicationProfile(profile as CommunicationProfileDB))
  } catch (error) {
    console.error('[ELIO:UPDATE_PROFILE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
