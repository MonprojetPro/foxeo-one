import type { ModuleManifest } from '@foxeo/types'

export const manifest: ModuleManifest = {
  id: 'notifications',
  name: 'Notifications',
  description: 'Centre de notifications in-app temps réel',
  version: '1.0.0',
  targets: ['hub', 'client-lab', 'client-one'],
  navigation: {
    label: 'Notifications',
    icon: 'bell',
    position: 0,
  },
  routes: [],
  requiredTables: ['notifications', 'notification_preferences'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
