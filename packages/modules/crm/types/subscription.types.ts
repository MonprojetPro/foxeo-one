// ============================================================
// Subscription Tier types (Story 9.4)
// ============================================================

/** Tiers d'abonnement pour les clients One */
export type SubscriptionTier = 'base' | 'essentiel' | 'agentique'

/** Tier Élio correspondant (null pour Base) */
export type ElioTierForSubscription = 'one' | 'one_plus' | null

/** Informations d'affichage d'un tier */
export interface TierInfo {
  name: string
  price: string
  elio: string
  description: string
}

