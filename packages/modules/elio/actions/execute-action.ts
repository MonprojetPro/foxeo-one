'use server'

import { errorResponse, type ActionResponse } from '@monprojetpro/types'
import { UPSELL_ONE_PLUS_MESSAGE } from '../config/system-prompts'

/**
 * Verrou des actions agentiques d'Élio — REFUSE TOUJOURS (décision MiKL 2026-08-19).
 *
 * Historique : ce check autorisait les clients `elio_tier = 'one_plus'` à exécuter des
 * actions agentiques. L'offre One+ ayant été redéfinie comme « One + coaching HUMAIN »
 * (modèle Centaure : One = IA, One+ = IA ET humain), aucune capacité agentique ne
 * distingue plus les deux tiers. Deux clients étaient encore en `one_plus` en base et
 * conservaient donc, à leur insu, un Élio qui en faisait plus que les autres.
 *
 * On ne lit plus `elio_tier` ici : cette colonne reste légitime, mais pour le COACHING
 * (crédits, visio, facturation), pas pour l'agentique. Un jour où l'automatisation
 * reviendra, ce sera au cas par cas et au devis — pas par un tier d'abonnement.
 *
 * @returns toujours { error } avec le message renvoyant vers MiKL.
 */
export async function checkElioTierAccess(
  clientId: string
): Promise<ActionResponse<true>> {
  if (!clientId) {
    return errorResponse('Client ID requis', 'INVALID_INPUT')
  }

  return errorResponse(UPSELL_ONE_PLUS_MESSAGE, 'TIER_INSUFFICIENT')
}
