import { describe, it, expect } from 'vitest'
import type { ModuleManifest } from '@monprojetpro/types'

describe('CII Module Contract Tests', () => {
  it('should have a valid manifest file', async () => {
    const { manifest } = await import('./manifest')

    expect(manifest).toBeDefined()
    expect(manifest.id).toBe('cii')
    expect(manifest.name).toBeDefined()
    expect(manifest.description).toBeDefined()
    expect(manifest.version).toBeDefined()
  })

  it('should target only hub dashboard', async () => {
    const { manifest } = await import('./manifest')

    expect(manifest.targets).toEqual(['hub'])
  })

  it('should require its own tables', async () => {
    const { manifest } = await import('./manifest')

    expect(manifest.requiredTables).toContain('cii_imports')
    expect(manifest.requiredTables).toContain('cii_reformulation_lines')
  })

  it('should export manifest from index.ts', async () => {
    const fs = await import('fs/promises')
    const path = await import('path')
    const index = await fs.readFile(path.join(__dirname, 'index.ts'), 'utf-8')

    expect(index).toMatch(/export\s*\{\s*manifest\s*\}\s*from\s*'\.\/manifest'/)
  })

  it('should have required documentation files', async () => {
    const fs = await import('fs/promises')
    const path = await import('path')

    const docsDir = path.resolve(__dirname, 'docs')

    await expect(fs.access(docsDir)).resolves.toBeUndefined()
    await expect(fs.access(path.join(docsDir, 'guide.md'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(docsDir, 'faq.md'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(docsDir, 'flows.md'))).resolves.toBeUndefined()
  })
})
