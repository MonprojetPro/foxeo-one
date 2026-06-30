import type { ModuleManifest } from '@monprojetpro/types'

/**
 * Module « MenuFacile » — cockpit d'administration d'un produit EXTERNE.
 *
 * Doctrine FORGE : ce module ne connaît AUCUN secret ni URL en dur. Toute la
 * spécificité du produit (URL du guichet admin-api + secret Bearer) vit dans les
 * variables d'environnement du Hub (MENUFACILE_ADMIN_API_URL / _SECRET), lues
 * exclusivement côté serveur. Le module ne touche JAMAIS la base Supabase de
 * MenuFacile : tout passe par le guichet `admin-api`.
 */
export const manifest: ModuleManifest = {
  id: 'menu-facile',
  name: 'MenuFacile',
  description: 'Cockpit d\'administration du produit externe MenuFacile (via guichet admin-api)',
  version: '1.0.0',
  targets: ['hub'],
  navigation: {
    label: 'MenuFacile',
    icon: 'chef-hat',
    position: 85,
  },
  routes: [
    {
      path: '/modules/menu-facile',
      component: 'MenuFacileDashboard',
    },
  ],
  // Aucune table locale : la donnée vit dans la base de MenuFacile, accédée via le guichet HTTP.
  requiredTables: [],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
