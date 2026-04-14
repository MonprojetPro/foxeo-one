import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'parcours',
  name: 'Parcours Lab',
  description: 'Accompagnement structuré de création pas à pas',
  version: '1.0.0',
  targets: ['client-lab'],
  navigation: {
    label: 'Mon Parcours',
    icon: 'map',
    position: 10,
  },
  routes: [
    { path: '/modules/parcours', component: 'ParcoursOverviewPage' },
    { path: '/modules/parcours/steps/:stepNumber', component: 'ParcoursStepDetailPage' },
  ],
  requiredTables: ['parcours', 'parcours_templates', 'parcours_steps'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
