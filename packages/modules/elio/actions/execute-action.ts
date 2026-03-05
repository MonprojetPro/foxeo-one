'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@foxeo/types'
import { UPSELL_ONE_PLUS_MESSAGE } from '../config/system-prompts'

/**
 * Vérifie si un client a le tier Élio One+ requis pour exécuter des actions agentiques.
 * Lit `client_configs.elio_tier` depuis la DB — check effectué AVANT tout appel LLM.
 *
 * Story 9.4 — AC#5 : "le check de tier est effectué avant l'appel LLM (pas de tokens gaspillés)"
 *
 * @returns { data: true } si le tier est 'one_plus'
 * @returns { error } avec message upsell si tier != 'one_plus'
 */
export async function checkElioTierAccess(
  clientId: string
): Promise<ActionResponse<true>> {
  if (!clientId) {
    return errorResponse('Client ID requis', 'INVALID_INPUT')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: config, error } = await supabase
      .from('client_configs')
      .select('elio_tier')
      .eq('client_id', clientId)
      .maybeSingle()

    if (error) {
      return errorResponse('Erreur lors de la vérification du tier', 'DATABASE_ERROR', error)
    }

    const tier = (config?.elio_tier as 'one' | 'one_plus' | null) ?? 'one'

    if (tier !== 'one_plus') {
      return errorResponse(UPSELL_ONE_PLUS_MESSAGE, 'TIER_INSUFFICIENT')
    }

    return successResponse(true as const)
  } catch (err) {
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
