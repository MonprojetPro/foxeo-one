import type { ModuleManifest } from '@foxeo/types'

export const coreDashboardManifest: ModuleManifest = {
  id: 'core-dashboard',
  name: 'Dashboard',
  version: '0.1.0',
  description: 'Module principal — accueil et vue d\'ensemble du dashboard',
  navigation: {
    icon: 'LayoutDashboard',
    label: 'Dashboard',
    position: 0,
  },
  routes: [
    {
      path: '/modules/core-dashboard',
      component: 'CoreDashboard',
    },
  ],
  requiredTables: [],
  targets: ['hub', 'client-lab', 'client-one'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
