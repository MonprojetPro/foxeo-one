import type { ModuleManifest, ModuleTarget } from '@monprojetpro/types'
import type { createServerSupabaseClient } from '@monprojetpro/supabase'

/**
 * Identifiants des modules de famille « cockpit », lus dans `module_catalog.family`.
 *
 * La distinction vit en base (vision v2), pas dans les manifests : « relation » = le socle
 * du lien avec MiKL (chat, documents, support, notifications…), « cockpit » = les briques
 * qui pilotent l'outil sur-mesure du client.
 *
 * Deux écrans doivent masquer ces modules — la sidebar (layout) et l'accueil One (page) —
 * et pour deux raisons différentes : abonnement terminé, ou outil pas encore livré. D'où
 * cette fonction partagée : deux filtrages concurrents finiraient par diverger, et un
 * module resterait visible d'un côté alors qu'il est masqué de l'autre.
 */
export async function getCockpitModuleIds(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<string[]> {
  const { data } = await supabase
    .from('module_catalog')
    .select('module_key')
    .eq('family', 'cockpit')

  return ((data as { module_key: string }[] | null) ?? []).map((m) => m.module_key)
}

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
