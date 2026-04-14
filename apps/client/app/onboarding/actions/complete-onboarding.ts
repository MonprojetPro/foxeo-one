'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface CompleteOnboardingResult {
  clientId: string
  redirectTo: string
}

/**
 * Finalise l'onboarding du client : met onboarding_completed = TRUE.
 * Retourne l'URL de redirection post-onboarding.
 */
export async function completeOnboarding(): Promise<ActionResponse<CompleteOnboardingResult>> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  // Récupérer le client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, onboarding_completed')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (clientError || !client) {
    console.error('[ONBOARDING:COMPLETE] Client not found:', clientError)
    return errorResponse('Client non trouvé', 'NOT_FOUND')
  }

  // Mettre à jour onboarding_completed
  const { error: updateError } = await supabase
    .from('clients')
    .update({ onboarding_completed: true })
    .eq('auth_user_id', user.id)

  if (updateError) {
    console.error('[ONBOARDING:COMPLETE] Update failed:', updateError)
    return errorResponse('Erreur lors de la finalisation', 'DATABASE_ERROR', updateError)
  }

  console.log('[ONBOARDING:COMPLETE] Client:', client.id)

  // Vérifier si le client a un parcours assigné
  const { data: parcours } = await supabase
    .from('parcours')
    .select('id')
    .eq('client_id', client.id)
    .eq('status', 'en_cours')
    .maybeSingle()

  const redirectTo = parcours ? '/modules/parcours' : '/'

  return successResponse({ clientId: client.id, redirectTo })
}
