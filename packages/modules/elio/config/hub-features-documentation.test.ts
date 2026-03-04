import { describe, it, expect } from 'vitest'
import { HUB_FEATURES_DOCUMENTATION } from './hub-features-documentation'

describe('HUB_FEATURES_DOCUMENTATION (Story 8.5 — Task 3)', () => {
  it('Task 3.1 — est une chaîne non vide', () => {
    expect(typeof HUB_FEATURES_DOCUMENTATION).toBe('string')
    expect(HUB_FEATURES_DOCUMENTATION.trim().length).toBeGreaterThan(0)
  })

  it('Task 3.2 — contient la section Gestion clients avec chemin /modules/crm', () => {
    expect(HUB_FEATURES_DOCUMENTATION).toContain('Gestion clients')
    expect(HUB_FEATURES_DOCUMENTATION).toContain('/modules/crm')
  })

  it('Task 3.2 — contient la section Validation Hub avec chemin /modules/validation-hub', () => {
    expect(HUB_FEATURES_DOCUMENTATION).toContain('Validation Hub')
    expect(HUB_FEATURES_DOCUMENTATION).toContain('/modules/validation-hub')
  })

  it('Task 3.2 — contient la section Chat avec chemin /modules/chat', () => {
    expect(HUB_FEATURES_DOCUMENTATION).toContain('/modules/chat')
  })

  it('Task 3.2 — contient la section Documents avec chemin /modules/documents', () => {
    expect(HUB_FEATURES_DOCUMENTATION).toContain('/modules/documents')
  })

  it('Task 3.2 — contient la section Analytics avec chemin /modules/analytics', () => {
    expect(HUB_FEATURES_DOCUMENTATION).toContain('Analytics')
    expect(HUB_FEATURES_DOCUMENTATION).toContain('/modules/analytics')
  })

  it('Task 3.2 — contient des instructions de navigation claires', () => {
    expect(HUB_FEATURES_DOCUMENTATION).toContain('Créer un client')
    expect(HUB_FEATURES_DOCUMENTATION).toContain('Nouveau client')
  })
})
