import type { ModuleManifest } from '@foxeo/types'

export const manifest: ModuleManifest = {
  id: 'admin',
  name: 'Administration',
  description: 'Administration système — provisioning instances One, monitoring, logs',
  version: '1.0.0',
  targets: ['hub'],
  navigation: {
    label: 'Admin',
    icon: 'settings',
    position: 90,
  },
  routes: [
    {
      path: '/modules/admin',
      component: 'AdminDashboard',
    },
  ],
  requiredTables: ['client_instances', 'activity_logs', 'system_config'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
