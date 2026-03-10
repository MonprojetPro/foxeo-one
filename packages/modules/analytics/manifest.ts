import type { ModuleManifest } from '@foxeo/types'

export const manifest: ModuleManifest = {
  id: 'analytics',
  name: 'Analytics',
  description: 'Métriques d\'usage et statistiques de la plateforme pour MiKL',
  version: '1.0.0',
  targets: ['hub'],
  navigation: {
    label: 'Analytics',
    icon: 'bar-chart',
    position: 80,
  },
  routes: [
    {
      path: '/modules/analytics',
      component: 'AnalyticsDashboard',
    },
  ],
  requiredTables: ['activity_logs', 'client_configs', 'billing_sync'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
