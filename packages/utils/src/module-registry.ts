import type { ModuleManifest, ModuleTarget } from '@monprojetpro/types'

const registry = new Map<string, ModuleManifest>()
let isDiscovered = false

export function registerModule(manifest: ModuleManifest): void {
  if (registry.has(manifest.id)) {
    console.warn(`Module "${manifest.id}" is already registered. Skipping.`)
    return
  }
  registry.set(manifest.id, manifest)
}

/**
 * Auto-discover all modules from packages/modules/
 * Static imports allow webpack to statically analyze dependencies (no dynamic expression warning).
 */
export async function discoverModules(): Promise<void> {
  if (isDiscovered) return

  const results = await Promise.allSettled([
    import('@monprojetpro/module-core-dashboard').then((m) => m.coreDashboardManifest),
    import('@monprojetpro/modules-chat').then((m) => m.manifest),
    import('@monprojetpro/module-documents').then((m) => m.manifest),
    import('@monprojetpro/module-elio').then((m) => m.manifest),
    import('@monprojetpro/module-parcours').then((m) => m.manifest),
    import('@monprojetpro/modules-validation-hub').then((m) => m.manifest),
    import('@monprojetpro/modules-crm').then((m) => m.manifest),
    import('@monprojetpro/modules-notifications').then((m) => m.manifest),
    import('@monprojetpro/module-visio').then((m) => m.manifest),
    import('@monprojetpro/modules-support').then((m) => m.manifest),
    import('@monprojetpro/module-admin').then((m) => m.manifest),
  ])

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      registerModule(result.value)
    }
  }

  isDiscovered = true
}

export function getModuleRegistry(): Map<string, ModuleManifest> {
  return new Map(registry)
}

export function getModule(id: string): ModuleManifest | undefined {
  return registry.get(id)
}

export function getModulesForTarget(target: ModuleTarget): ModuleManifest[] {
  return Array.from(registry.values())
    .filter((m) => m.targets.includes(target))
    .sort((a, b) => a.navigation.position - b.navigation.position)
}

export function clearRegistry(): void {
  registry.clear()
  isDiscovered = false
}
