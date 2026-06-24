import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'facturation',
  name: 'Comptabilité',
  description: 'Gestion des devis, factures, abonnements et paiements via Pennylane',
  version: '1.0.0',
  // ⚠️ Vision One v2 (2026-06-24) — « Comptabilité » SORT du socle One.
  // C'était une future brique cockpit (outil pour que le CLIENT facture SES clients),
  // pas du socle relation. Le code du module est conservé (resservira en bibliothèque FORGE).
  // L'aspect « mes factures d'abonnement MPP » (synchro Pennylane) est rapatrié dans
  // Paramètres → Mes factures (cf. apps/client/.../settings/billing).
  // On ne cible donc plus `client-one` : le module reste uniquement côté Hub (opérateur).
  targets: ['hub'],
  navigation: {
    label: 'Comptabilité',
    icon: 'calculator',
    position: 60
  },
  routes: [
    {
      path: '/modules/facturation',
      component: 'BillingDashboard'
    }
  ],
  requiredTables: ['billing_sync'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
