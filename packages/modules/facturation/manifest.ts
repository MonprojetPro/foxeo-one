import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'facturation',
  name: 'Comptabilité',
  description: 'Gestion des devis, factures, abonnements et paiements via Pennylane',
  version: '1.0.0',
  targets: ['hub', 'client-one'],
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
