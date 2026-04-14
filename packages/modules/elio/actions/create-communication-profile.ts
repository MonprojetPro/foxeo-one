'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  CreateCommunicationProfileInput,
  toCommunicationProfile,
  type CommunicationProfile,
  type CommunicationProfileDB,
} from '../types/communication-profile.types'

export async function createCommunicationProfile(
  input: Partial<CreateCommunicationProfileInput> & { clientId: string }
): Promise<ActionResponse<CommunicationProfile>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = CreateCommunicationProfileInput.safeParse({
      preferredTone: 'friendly',
      preferredLength: 'balanced',
      interactionStyle: 'collaborative',
      contextPreferences: {},
      ...input,
    })
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
      console.error('[ELIO:CREATE_PROFILE] Client not found:', clientError)
      return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
    }

    const { data: profile, error: insertError } = await supabase
      .from('communication_profiles')
      .insert({
        client_id: parsed.data.clientId,
        preferred_tone: parsed.data.preferredTone,
        preferred_length: parsed.data.preferredLength,
        interaction_style: parsed.data.interactionStyle,
        context_preferences: parsed.data.contextPreferences,
      })
      .select()
      .single()

    if (insertError || !profile) {
      console.error('[ELIO:CREATE_PROFILE] Insert error:', insertError)
      return errorResponse('Erreur lors de la création du profil', 'DATABASE_ERROR', insertError)
    }

    return successResponse(toCommunicationProfile(profile as CommunicationProfileDB))
  } catch (error) {
    console.error('[ELIO:CREATE_PROFILE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
