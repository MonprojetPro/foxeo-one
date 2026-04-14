'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

export interface TeasingEligibility {
  showTeasing: boolean
}

/**
 * Server Action — Vérifie si le teasing Lab doit être affiché pour un client One.
 * Logique :
 *   1. Fetch client_configs.show_lab_teasing — si false → showTeasing: false
 *   2. Fetch parcours actif (status='en_cours') — si trouvé → showTeasing: false
 *   3. Sinon → showTeasing: true
 *
 * Retourne toujours { data, error } — jamais throw.
 */
export async function getTeasingEligibility(
  clientId: string
): Promise<ActionResponse<TeasingEligibility>> {
  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Check show_lab_teasing config
  const { data: configData, error: configError } = await supabase
    .from('client_configs')
    .select('show_lab_teasing')
    .eq('client_id', clientId)
    .maybeSingle()

  if (configError) {
    console.error('[CORE-DASHBOARD:TEASING] Config query error:', configError)
    return errorResponse('Erreur lors de la vérification de la configuration', 'DB_ERROR', configError)
  }

  // show_lab_teasing defaults to true if config not found
  const showLabTeasing = configData?.show_lab_teasing ?? true
  if (!showLabTeasing) {
    return successResponse({ showTeasing: false })
  }

  // 2. Check for active parcours (en_cours = in progress)
  const { data: parcoursData, error: parcoursError } = await supabase
    .from('parcours')
    .select('status')
    .eq('client_id', clientId)
    .eq('status', 'en_cours')
    .maybeSingle()

  if (parcoursError) {
    console.error('[CORE-DASHBOARD:TEASING] Parcours query error:', parcoursError)
    return errorResponse('Erreur lors de la vérification du parcours', 'DB_ERROR', parcoursError)
  }

  // If an active parcours exists, hide teasing
  if (parcoursData) {
    return successResponse({ showTeasing: false })
  }

  return successResponse({ showTeasing: true })
}
