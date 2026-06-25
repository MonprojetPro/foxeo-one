'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

/**
 * Résumé cockpit One — données qui ne sont PAS exposées par un hook client existant.
 *
 * Pourquoi une action dédiée (et pas un module) : ces trois infos vivent dans des tables
 * différentes (validation_requests, client_configs) et aucun module client ne les agrège.
 * Le module CRM le ferait côté Hub, mais son `useClient`/`useClientInstance` exige une
 * identité OPÉRATEUR (RLS) → inutilisable depuis l'app client. On requête donc directement,
 * en s'appuyant sur la RLS « owner » (le client ne voit que ses propres lignes).
 *
 * Toutes les autres cartes du cockpit (suivi-outil, documents, messages, visio, support)
 * utilisent les hooks TanStack + Realtime déjà branchés de leurs modules respectifs.
 *
 * Ne throw jamais : retourne toujours { data, error }.
 */
export interface OneCockpitSummary {
  /** Demandes d'évolution en attente (validation_requests type=evolution_one, status=pending). */
  evolutionPendingCount: number
  /** Tier d'abonnement One : 'one' | 'one_plus' (libellé résolu côté UI). */
  elioTier: 'one' | 'one_plus'
  /** Cycle de vie de l'outil sur-mesure : 'construction' | 'delivered' | null. */
  oneStatus: 'construction' | 'delivered' | null
}

export async function getOneCockpitSummary(
  clientId: string
): Promise<ActionResponse<OneCockpitSummary>> {
  try {
    if (!clientId) {
      return errorResponse('ID client manquant', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    // En parallèle : compteur de demandes d'évolution en attente + config (tier, statut outil).
    const [evolutionResult, configResult] = await Promise.all([
      supabase
        .from('validation_requests')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('type', 'evolution_one')
        .eq('status', 'pending'),
      supabase
        .from('client_configs')
        .select('elio_tier, one_status')
        .eq('client_id', clientId)
        .maybeSingle(),
    ])

    if (evolutionResult.error) {
      console.error('[ONE_COCKPIT:SUMMARY] Evolution count error:', evolutionResult.error)
      return errorResponse(
        'Erreur lors du chargement des demandes',
        'DATABASE_ERROR',
        evolutionResult.error
      )
    }

    const config = configResult.data as
      | { elio_tier: 'one' | 'one_plus' | null; one_status: string | null }
      | null

    const oneStatus =
      config?.one_status === 'construction' || config?.one_status === 'delivered'
        ? config.one_status
        : null

    return successResponse<OneCockpitSummary>({
      evolutionPendingCount: evolutionResult.count ?? 0,
      elioTier: config?.elio_tier === 'one_plus' ? 'one_plus' : 'one',
      oneStatus,
    })
  } catch (error) {
    console.error('[ONE_COCKPIT:SUMMARY] Unexpected error:', error)
    return errorResponse(
      'Erreur inattendue',
      'INTERNAL_ERROR',
      { message: error instanceof Error ? error.message : String(error) }
    )
  }
}
