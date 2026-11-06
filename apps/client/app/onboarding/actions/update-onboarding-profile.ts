'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface UpdateOnboardingProfileInput {
  firstName: string
  name: string
  contact: string
  phone: string
  sector: string
  website: string
}

/**
 * T-078 — dernière étape du nouveau parcours d'activation : le client corrige/complète
 * ses coordonnées, puis l'onboarding est marqué terminé et la session close — il doit
 * ensuite se reconnecter avec ses identifiants définitifs (décision explicite de MiKL).
 */
export async function updateOnboardingProfile(
  input: UpdateOnboardingProfileInput
): Promise<ActionResponse<{ ok: true }>> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  if (!input.name || !input.name.trim()) {
    return errorResponse('Le nom est obligatoire', 'VALIDATION_ERROR')
  }

  // T-078 — même défaut RLS que T-076 (DEP-011) : un .update() direct serait filtré en
  // silence, la RPC SECURITY DEFINER dédiée est le seul chemin fiable.
  const { error: profileError } = await supabase.rpc('fn_update_onboarding_profile', {
    p_first_name: input.firstName,
    p_name: input.name,
    p_contact: input.contact,
    p_phone: input.phone,
    p_sector: input.sector,
    p_website: input.website,
  })

  if (profileError) {
    console.error('[ONBOARDING:PROFILE] Update failed:', profileError)
    return errorResponse('Erreur lors de la mise à jour du profil', 'DATABASE_ERROR', profileError)
  }

  const { error: completeError } = await supabase.rpc('fn_complete_client_onboarding')
  if (completeError) {
    console.error('[ONBOARDING:PROFILE] Complete onboarding failed:', completeError)
    return errorResponse('Erreur lors de la finalisation', 'DATABASE_ERROR', completeError)
  }

  // Déconnexion volontaire : le client doit valider son premier vrai login avec ses
  // identifiants définitifs plutôt que de continuer sur la session ouverte par le lien.
  await supabase.auth.signOut()

  return successResponse({ ok: true })
}
