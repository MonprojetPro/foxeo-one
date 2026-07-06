'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

/**
 * Infos coaching One+ côté CLIENT (carte Coaching du cockpit One + bandeau page visio).
 *
 * S'appuie sur la RLS « owner » : le client ne lit que ses propres lignes
 * (client_configs_select_owner, coaching_credit_ledger_select_owner, meetings_select_owner).
 * Le solde vient de la fonction SQL get_coaching_balance (guardée owner/opérateur).
 *
 * Robuste : si la migration coaching n'est pas encore déployée (RPC absente),
 * retourne un état neutre plutôt qu'une erreur — la carte se masque côté UI.
 */
export interface ClientCoachingInfo {
  /** Tier de l'offre One : 'one' | 'one_plus' | null. La carte Coaching n'existe qu'en one_plus. */
  elioTier: 'one' | 'one_plus' | null
  /** Solde de crédits coaching (somme des delta du ledger). */
  balance: number
  /** Prochaine séance de coaching planifiée (meetings type='coaching', status='scheduled'). */
  nextSessionAt: string | null
  nextSessionTitle: string | null
}

export async function getCoachingInfo(
  clientId: string
): Promise<ActionResponse<ClientCoachingInfo>> {
  try {
    if (!clientId) {
      return errorResponse('ID client manquant', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: config } = await supabase
      .from('client_configs')
      .select('elio_tier')
      .eq('client_id', clientId)
      .maybeSingle()

    const elioTier =
      config?.elio_tier === 'one_plus' ? 'one_plus' : config?.elio_tier === 'one' ? 'one' : null

    if (elioTier !== 'one_plus') {
      return successResponse<ClientCoachingInfo>({
        elioTier,
        balance: 0,
        nextSessionAt: null,
        nextSessionTitle: null,
      })
    }

    const [balanceResult, nextSessionResult] = await Promise.all([
      supabase.rpc('get_coaching_balance', { p_client_id: clientId }),
      supabase
        .from('meetings')
        .select('title, scheduled_at')
        .eq('client_id', clientId)
        .eq('type', 'coaching')
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

    if (balanceResult.error) {
      // Migration coaching pas encore déployée → état neutre, non bloquant
      console.error('[VISIO:COACHING_INFO] Balance error (fallback 0):', balanceResult.error)
    }

    const next = nextSessionResult.data as { title: string; scheduled_at: string | null } | null

    return successResponse<ClientCoachingInfo>({
      elioTier,
      balance: typeof balanceResult.data === 'number' ? balanceResult.data : 0,
      nextSessionAt: next?.scheduled_at ?? null,
      nextSessionTitle: next?.title ?? null,
    })
  } catch (error) {
    console.error('[VISIO:COACHING_INFO] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
