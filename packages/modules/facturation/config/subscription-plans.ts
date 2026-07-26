// ============================================================
// Grille tarifaire v2 — Contrat 6 (chantier 2026-07-06)
// | Tier technique | Offre commerciale | Prix HT/mois |
// | base           | Ponctuel (devis)  | devis        |
// | essentiel      | One               | 39 €         |
// | agentique      | One+              | 99 €         |
//
// ⚠️ Fichier volontairement SANS 'use server' : il exporte des
// constantes, importées à la fois par la Server Action
// create-subscription.ts et par le composant client
// subscription-form.tsx. Un export const dans un fichier
// 'use server' casse next build (exports async only).
// ============================================================

export type SubscriptionPlan = 'ponctuel' | 'essentiel' | 'agentique'
export type RecurringPeriod = 'monthly' | 'quarterly' | 'yearly'
export type PaymentMethod = 'cb' | 'virement' | 'sepa'

// Prix mensuel HT de base par plan (null = ponctuel → devis / montant variable)
export const PLAN_MONTHLY_PRICE: Record<SubscriptionPlan, number | null> = {
  ponctuel: null,
  essentiel: 39,
  agentique: 99,
}

// Libellé commercial utilisé dans les line_items Pennylane (1ère ligne)
export const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  ponctuel: 'Forfait ponctuel',
  essentiel: 'Abonnement One',
  agentique: 'Abonnement One+',
}

// Nom commercial court (affichage UI)
export const PLAN_COMMERCIAL_NAME: Record<SubscriptionPlan, string> = {
  ponctuel: 'Ponctuel',
  essentiel: 'One',
  agentique: 'One+',
}

// Mapping plan Pennylane → client_configs.subscription_tier.
// Recyclage subscription_tier (2026-07-26) : la colonne porte désormais directement
// l'identifiant de l'offre commerciale ('ponctuel'/'one'/'one_plus') — ce mapping ne fait
// plus que renommer 'essentiel' → 'one' et 'agentique' → 'one_plus' (le plan Pennylane
// garde son nom historique, distinct du tier de facturation One).
export const PLAN_TIER: Record<SubscriptionPlan, 'ponctuel' | 'one' | 'one_plus'> = {
  ponctuel: 'ponctuel',
  essentiel: 'one',
  agentique: 'one_plus',
}

// NOTE : les anciens AVAILABLE_EXTRAS (Visio/CRM/Documents/Analytics)
// ont été supprimés — la grille v2 n'a plus de modules extras à la
// création d'abonnement.
