import type { ModuleManifest } from '@foxeo/types'

export const manifest: ModuleManifest = {
  id: 'templates',
  name: 'Templates',
  description: 'Templates de parcours Lab réutilisables et personnalisation des emails automatiques',
  version: '1.0.0',
  targets: ['hub'],
  navigation: {
    label: 'Templates',
    icon: 'file-text',
    position: 85,
  },
  routes: [
    {
      path: '/modules/templates',
      component: 'TemplatesDashboard',
    },
  ],
  requiredTables: ['parcours_templates', 'email_templates'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
