import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'suivi-outil',
  name: "Suivi de l'outil",
  version: '1.0.0',
  description: "Fil d'avancement du développement de l'outil client, publié par l'opérateur.",
  navigation: {
    icon: 'Hammer',
    label: "Suivi de l'outil",
    position: 60,
  },
  routes: [
    { path: '/modules/suivi-outil', component: 'SuiviOutilPage' },
    { path: '/modules/suivi-outil/:clientId', component: 'SuiviOutilClientPage' },
  ],
  requiredTables: ['tool_posts'],
  targets: ['client-one'],
  dependencies: ['notifications'],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
