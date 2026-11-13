import type { ModuleManifest } from '@monprojetpro/types'

/**
 * Module « GuardVeto » — cockpit d'administration d'un produit EXTERNE,
 * sur le modèle de MenuFacile (item T-082).
 *
 * Doctrine FORGE : aucun secret, aucune URL en dur. La spécificité du produit
 * (URL du guichet + secret Bearer) vit dans les variables d'environnement du
 * Hub — `GUARDVETO_ADMIN_API_URL` / `GUARDVETO_ADMIN_API_SECRET` — lues
 * exclusivement côté serveur.
 *
 * 🔑 LE HUB NE TOUCHE JAMAIS LA BASE DE GUARDVETO. Tout passe par le guichet
 * `/api/hub/*` de GuardVeto (item B-212 de son board). Deux produits, deux
 * bases, un seul point de passage : une base partagée entre deux produits
 * finit toujours par faire dépendre le calendrier de l'un des migrations de
 * l'autre.
 */
export const manifest: ModuleManifest = {
  id: 'guard-veto',
  name: 'GuardVeto',
  description: "Cockpit d'administration du produit externe GuardVeto (via son guichet /api/hub)",
  version: '1.0.0',
  targets: ['hub'],
  navigation: {
    label: 'GuardVeto',
    icon: 'shield-check',
    position: 86,
  },
  routes: [
    {
      path: '/modules/guard-veto',
      component: 'GuardVetoDashboard',
    },
  ],
  // Aucune table locale : la donnée vit dans la base de GuardVeto, lue via le guichet HTTP.
  requiredTables: [],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
