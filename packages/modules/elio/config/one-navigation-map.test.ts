import { describe, it, expect } from 'vitest'
import { ONE_NAVIGATION_MAP } from './one-navigation-map'

describe('ONE_NAVIGATION_MAP (Story 8.7 — Task 5)', () => {
  it('Task 5.2 — contient les modules de base toujours actifs', () => {
    expect(ONE_NAVIGATION_MAP).toContain('/profil')
    expect(ONE_NAVIGATION_MAP).toContain('/modules/documents')
    expect(ONE_NAVIGATION_MAP).toContain('/support')
  })

  it('Task 5.2 — contient les modules optionnels', () => {
    expect(ONE_NAVIGATION_MAP).toContain('/modules/facturation')
    expect(ONE_NAVIGATION_MAP).toContain('/modules/agenda')
    expect(ONE_NAVIGATION_MAP).toContain('/modules/membres')
    expect(ONE_NAVIGATION_MAP).toContain('/modules/sms')
    expect(ONE_NAVIGATION_MAP).toContain('/modules/presences')
  })

  it('Task 5.3 — mentionne la possibilité de demander l\'activation à MiKL', () => {
    expect(ONE_NAVIGATION_MAP).toContain('MiKL')
    expect(ONE_NAVIGATION_MAP).toContain('activer')
  })

  it('est une chaîne non vide', () => {
    expect(ONE_NAVIGATION_MAP.trim().length).toBeGreaterThan(0)
  })
})
