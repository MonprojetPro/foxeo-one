import type { SubscriptionTier, ElioTierForSubscription, TierInfo } from '../types/subscription.types'

/** Informations d'affichage par tier (Story 9.4 — AC#1, #2) */
export const TIER_INFO: Record<SubscriptionTier, TierInfo> = {
  base: {
    name: 'Base',
    price: 'Ponctuel',
    elio: 'Aucun',
    description: 'Maintenance 1 mois + documentation technique',
  },
  essentiel: {
    name: 'Essentiel',
    price: '39€/mois',
    elio: 'Elio One',
    description: 'Maintenance continue, mises à jour, Elio One assistant',
  },
  agentique: {
    name: 'Agentique',
    price: '99€/mois',
    elio: 'Elio One+',
    description: 'Tout One + 1 visio de coaching humain / mois (One+)',
  },
}

/**
 * Mappe un tier d'abonnement vers le tier Élio correspondant.
 * Base → null (pas d'Elio), Essentiel (One) → 'one', Agentique (One+) → 'one_plus'.
 *
 * Grille v2 (Contrat 6, chantier 2026-07-06 — validé MiKL) : `elio_tier` identifie
 * désormais l'OFFRE commerciale (One 39 € / One+ 99 €). One+ = coaching humain
 * (1 visio/mois, crédits coaching) — PAS d'agentique IA (toujours au devis,
 * décision MiKL 2026-06-26). Le dash One+ affiche en plus la carte Coaching.
 */
export function mapTierToElio(tier: SubscriptionTier): ElioTierForSubscription {
  switch (tier) {
    case 'base':
      return null
    case 'essentiel':
      return 'one'
    case 'agentique':
      return 'one_plus'
  }
}

/** Classes CSS de badge par tier d'abonnement */
export const TIER_BADGE_CLASSES: Record<SubscriptionTier, string> = {
  base: 'bg-muted text-muted-foreground',
  essentiel: 'bg-green-500/20 text-green-400 border border-green-500/40',
  agentique: 'bg-violet-500/20 text-violet-400 border border-violet-500/40',
}

/** Retourne true si le passage de oldTier vers newTier est un downgrade depuis One+ */
export function isDowngradeFromOnePlus(
  oldTier: SubscriptionTier,
  newTier: SubscriptionTier
): boolean {
  return oldTier === 'agentique' && newTier !== 'agentique'
}

/** Retourne true si le passage de oldTier vers newTier est un upgrade vers One+ */
export function isUpgradeToOnePlus(
  oldTier: SubscriptionTier,
  newTier: SubscriptionTier
): boolean {
  return oldTier !== 'agentique' && newTier === 'agentique'
}
