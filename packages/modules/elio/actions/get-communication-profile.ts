'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  GetCommunicationProfileInput,
  toCommunicationProfile,
  type CommunicationProfile,
  type CommunicationProfileDB,
} from '../types/communication-profile.types'

export async function getCommunicationProfile(
  input: GetCommunicationProfileInput
): Promise<ActionResponse<CommunicationProfile | null>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetCommunicationProfileInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data: profile, error: profileError } = await supabase
      .from('communication_profiles')
      .select('*')
      .eq('client_id', parsed.data.clientId)
      .maybeSingle()

    if (profileError) {
      console.error('[ELIO:GET_PROFILE] DB error:', profileError)
      return errorResponse('Erreur lors de la récupération du profil', 'DATABASE_ERROR', profileError)
    }

    // Profile may not exist yet (first conversation)
    if (!profile) {
      return successResponse(null)
    }

    return successResponse(toCommunicationProfile(profile as CommunicationProfileDB))
  } catch (error) {
    console.error('[ELIO:GET_PROFILE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
