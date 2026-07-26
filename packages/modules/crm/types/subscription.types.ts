// ============================================================
// Subscription Tier types (Story 9.4)
// ============================================================

/**
 * Offres commerciales pour les clients One (Recyclage subscription_tier, 2026-07-26).
 * L'identifiant technique EST l'identifiant commercial — plus de double couche de nommage
 * (voir migration 20260726150000 pour l'historique 'base'/'essentiel'/'agentique').
 */
export type SubscriptionTier = 'ponctuel' | 'one' | 'one_plus'

/** Tier Élio correspondant (null pour Base) */
export type ElioTierForSubscription = 'one' | 'one_plus' | null

/** Informations d'affichage d'un tier */
export interface TierInfo {
  name: string
  price: string
  elio: string
  description: string
}

