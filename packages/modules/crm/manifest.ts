import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'crm',
  name: 'CRM',
  description: 'Gestion de la relation client — liste, filtres, recherche et fiches clients',
  version: '1.0.0',
  targets: ['hub'],
  navigation: {
    label: 'CRM',
    icon: 'users',
    position: 10
  },
  routes: [
    {
      path: '/modules/crm',
      component: 'ClientList'
    },
    {
      path: '/modules/crm/clients/:clientId',
      component: 'ClientDetail'
    },
    {
      path: '/modules/crm/reminders',
      component: 'Reminders'
    },
    {
      path: '/modules/crm/stats',
      component: 'StatsDashboard'
    }
  ],
  requiredTables: ['clients', 'client_configs', 'parcours', 'parcours_templates', 'client_notes', 'reminders', 'activity_logs', 'notifications'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
