import type { ModuleManifest } from '@foxeo/types'

export const manifest: ModuleManifest = {
  id: 'facturation',
  name: 'Facturation',
  description: 'Gestion des devis, factures, abonnements et paiements via Pennylane',
  version: '1.0.0',
  targets: ['hub', 'client-one'],
  navigation: {
    label: 'Facturation',
    icon: 'receipt',
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
