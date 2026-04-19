import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'validation-hub',
  name: 'Validation Hub',
  description: 'File d\'attente des demandes de validation — briefs Lab et évolutions One',
  version: '1.0.0',
  targets: ['hub', 'client-lab'],
  navigation: {
    label: 'Soumissions',
    icon: 'send',
    position: 40,
  },
  routes: [
    {
      path: '/modules/validation-hub',
      component: 'ValidationQueue',
    },
    {
      path: '/modules/validation-hub/:requestId',
      component: 'ValidationDetail',
    },
  ],
  requiredTables: ['validation_requests', 'clients'],
  dependencies: ['crm', 'notifications'],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
