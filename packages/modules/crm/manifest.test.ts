import { describe, it, expect } from 'vitest'
import type { ModuleManifest } from '@monprojetpro/types'

describe('CRM Module Contract Tests', () => {
  it('should have a valid manifest file', async () => {
    const { manifest } = await import('./manifest')

    expect(manifest).toBeDefined()
    expect(manifest.id).toBe('crm')
    expect(manifest.name).toBeDefined()
    expect(manifest.description).toBeDefined()
    expect(manifest.version).toBeDefined()
  })

  it('should target only hub dashboard', async () => {
    const { manifest } = await import('./manifest')

    expect(manifest.targets).toEqual(['hub'])
  })

  it('should have navigation configuration', async () => {
    const { manifest } = await import('./manifest')

    expect(manifest.navigation).toBeDefined()
    expect(manifest.navigation?.label).toBeDefined()
    expect(manifest.navigation?.icon).toBeDefined()
    expect(manifest.navigation?.position).toBeTypeOf('number')
  })

  it('should have routes configuration', async () => {
    const { manifest } = await import('./manifest')

    expect(manifest.routes).toBeDefined()
    expect(Array.isArray(manifest.routes)).toBe(true)
    expect(manifest.routes.length).toBeGreaterThan(0)
  })

  it('should require clients and client_configs tables', async () => {
    const { manifest } = await import('./manifest')

    expect(manifest.requiredTables).toBeDefined()
    expect(manifest.requiredTables).toContain('clients')
    expect(manifest.requiredTables).toContain('client_configs')
  })

  it('should export manifest from index.ts', async () => {
    const moduleExports = await import('./index')

    expect(moduleExports.manifest).toBeDefined()
    expect(moduleExports.manifest.id).toBe('crm')
  }, 20000) // 20s timeout for module import (needed for full test suite)

  it('should have required documentation files', async () => {
    const fs = await import('fs/promises')
    const path = await import('path')

    const docsDir = path.resolve(__dirname, 'docs')

    // Check if docs directory exists
    await expect(fs.access(docsDir)).resolves.toBeUndefined()

    // Check for required doc files
    await expect(fs.access(path.join(docsDir, 'guide.md'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(docsDir, 'faq.md'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(docsDir, 'flows.md'))).resolves.toBeUndefined()
  })
})
