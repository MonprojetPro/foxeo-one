import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  registerModule,
  getModuleRegistry,
  getModule,
  getModulesForTarget,
  clearRegistry,
  discoverModules,
} from './module-registry'
import type { ModuleManifest } from '@monprojetpro/types'

const mockManifest: ModuleManifest = {
  id: 'test-module',
  name: 'Test Module',
  version: '1.0.0',
  description: 'A test module',
  navigation: { icon: 'TestIcon', label: 'Test', position: 1 },
  routes: [{ path: '/test', component: 'TestComponent' }],
  requiredTables: [],
  targets: ['hub', 'client-lab'],
  dependencies: [],
}

const mockManifest2: ModuleManifest = {
  id: 'another-module',
  name: 'Another Module',
  version: '1.0.0',
  description: 'Another test module',
  navigation: { icon: 'Icon2', label: 'Another', position: 0 },
  routes: [{ path: '/another', component: 'AnotherComponent' }],
  requiredTables: [],
  targets: ['hub'],
  dependencies: [],
}

describe('module-registry', () => {
  beforeEach(() => {
    clearRegistry()
  })

  it('registers a module', () => {
    registerModule(mockManifest)
    expect(getModule('test-module')).toEqual(mockManifest)
  })

  it('returns undefined for unregistered module', () => {
    expect(getModule('nonexistent')).toBeUndefined()
  })

  it('does not register duplicate modules', () => {
    registerModule(mockManifest)
    registerModule(mockManifest)
    expect(getModuleRegistry().size).toBe(1)
  })

  it('returns all registered modules', () => {
    registerModule(mockManifest)
    registerModule(mockManifest2)
    expect(getModuleRegistry().size).toBe(2)
  })

  it('filters modules by target', () => {
    registerModule(mockManifest)
    registerModule(mockManifest2)

    const hubModules = getModulesForTarget('hub')
    expect(hubModules).toHaveLength(2)

    const labModules = getModulesForTarget('client-lab')
    expect(labModules).toHaveLength(1)
    expect(labModules[0]?.id).toBe('test-module')

    const oneModules = getModulesForTarget('client-one')
    expect(oneModules).toHaveLength(0)
  })

  it('sorts modules by navigation position', () => {
    registerModule(mockManifest) // position: 1
    registerModule(mockManifest2) // position: 0

    const hubModules = getModulesForTarget('hub')
    expect(hubModules[0]?.id).toBe('another-module')
    expect(hubModules[1]?.id).toBe('test-module')
  })

  it('clears registry', () => {
    registerModule(mockManifest)
    clearRegistry()
    expect(getModuleRegistry().size).toBe(0)
  })

  describe('client-one target filtering', () => {
    const oneModule: ModuleManifest = {
      id: 'chat',
      name: 'Chat',
      version: '1.0.0',
      description: 'Chat module',
      navigation: { icon: 'MessageCircle', label: 'Chat', position: 20 },
      routes: [],
      requiredTables: [],
      targets: ['client-lab', 'client-one'],
      dependencies: [],
    }
    const labOnlyModule: ModuleManifest = {
      id: 'parcours',
      name: 'Parcours',
      version: '1.0.0',
      description: 'Parcours Lab',
      navigation: { icon: 'Map', label: 'Parcours', position: 10 },
      routes: [],
      requiredTables: [],
      targets: ['client-lab'],
      dependencies: [],
    }

    it('returns only client-one modules for target client-one', () => {
      registerModule(oneModule)
      registerModule(labOnlyModule)

      const oneModules = getModulesForTarget('client-one')
      expect(oneModules).toHaveLength(1)
      expect(oneModules[0]?.id).toBe('chat')
    })

    it('supports active_modules filter pattern (consumer-side)', () => {
      const docsModule: ModuleManifest = {
        id: 'documents',
        name: 'Documents',
        version: '1.0.0',
        description: 'Docs module',
        navigation: { icon: 'FileText', label: 'Documents', position: 30 },
        routes: [],
        requiredTables: [],
        targets: ['client-one'],
        dependencies: [],
      }
      registerModule(oneModule)
      registerModule(docsModule)

      const activeModules = ['chat'] // only chat is active
      const filtered = getModulesForTarget('client-one').filter((m) =>
        activeModules.includes(m.id)
      )
      expect(filtered).toHaveLength(1)
      expect(filtered[0]?.id).toBe('chat')
    })

    it('returns empty array when no active_modules match', () => {
      registerModule(oneModule)
      const activeModules: string[] = []
      const filtered = getModulesForTarget('client-one').filter((m) =>
        activeModules.includes(m.id)
      )
      expect(filtered).toHaveLength(0)
    })
  })

  describe('discoverModules', () => {
    it('resolves without throwing', async () => {
      // discoverModules uses try/catch internally — should never throw
      await expect(discoverModules()).resolves.toBeUndefined()
    }, 15000)

    it('sets isDiscovered flag so second call is a no-op', async () => {
      // First call discovers and fills the registry
      await discoverModules()
      const sizeAfterFirst = getModuleRegistry().size
      expect(sizeAfterFirst).toBeGreaterThan(0)
      // Second call should be a no-op (isDiscovered guard)
      await discoverModules()
      expect(getModuleRegistry().size).toBe(sizeAfterFirst)
    }, 15000)

    it('registers at least one module on discovery', async () => {
      clearRegistry()
      await discoverModules()
      // After discovery, at least core-dashboard should be registered
      expect(getModuleRegistry().size).toBeGreaterThan(0)
    }, 15000)
  })
})
