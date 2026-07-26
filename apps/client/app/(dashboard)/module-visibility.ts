import type { ModuleManifest, ModuleTarget } from '@monprojetpro/types'

/**
 * Calcule les modules réellement affichés dans la sidebar client.
 *
 * `hiddenModuleIds` porte les modules de famille « cockpit » quand l'abonnement du
 * client est terminé : ils disparaissent du MENU, mais ne sont jamais retirés de
 * `client_configs.active_modules`. C'est la différence qui rend la réactivation non
 * destructive — on retrouve exactement la configuration d'avant.
 */
export function selectVisibleModules(
  manifests: ModuleManifest[],
  target: ModuleTarget,
  activeModules: string[],
  hiddenModuleIds: string[] = [],
): ModuleManifest[] {
  return manifests
    .filter((m) => m.targets.includes(target) && activeModules.includes(m.id))
    .filter((m) => !hiddenModuleIds.includes(m.id))
    .sort((a, b) => a.navigation.position - b.navigation.position)
}
