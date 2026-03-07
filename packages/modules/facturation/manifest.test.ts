import { describe, it, expect } from 'vitest'
import { manifest } from './manifest'

describe('facturation manifest — contract test', () => {
  it('has required ModuleManifest fields', () => {
    expect(manifest.id).toBe('facturation')
    expect(manifest.name).toBeTruthy()
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(manifest.description).toBeTruthy()
    expect(Array.isArray(manifest.targets)).toBe(true)
    expect(Array.isArray(manifest.dependencies)).toBe(true)
    expect(Array.isArray(manifest.requiredTables)).toBe(true)
    expect(manifest.navigation).toHaveProperty('label')
    expect(manifest.navigation).toHaveProperty('icon')
    expect(manifest.navigation).toHaveProperty('position')
  })

  it('targets hub and client-one (no lab)', () => {
    expect(manifest.targets).toContain('hub')
    expect(manifest.targets).toContain('client-one')
    expect(manifest.targets).not.toContain('client-lab')
  })
})
