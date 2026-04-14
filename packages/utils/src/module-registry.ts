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
 * Each module is imported with try/catch — missing modules are silently skipped.
 */
export async function discoverModules(): Promise<void> {
  if (isDiscovered) return

  const moduleImports: Array<{
    pkg: string
    named?: string
  }> = [
    { pkg: '@monprojetpro/module-core-dashboard', named: 'coreDashboardManifest' },
    { pkg: '@monprojetpro/modules-chat' },
    { pkg: '@monprojetpro/module-documents' },
    { pkg: '@monprojetpro/module-elio' },
    { pkg: '@monprojetpro/module-parcours' },
    { pkg: '@monprojetpro/modules-validation-hub' },
    { pkg: '@monprojetpro/modules-crm' },
    { pkg: '@monprojetpro/modules-notifications' },
    { pkg: '@monprojetpro/module-visio' },
    { pkg: '@monprojetpro/modules-support' },
    { pkg: '@monprojetpro/module-admin' },
  ]

  for (const { pkg, named } of moduleImports) {
    try {
      const mod = await import(pkg)
      const manifest: ModuleManifest = named ? mod[named] : mod.manifest
      if (manifest) {
        registerModule(manifest)
      }
    } catch {
      // Module not available — skip silently (tolerant to missing modules)
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
