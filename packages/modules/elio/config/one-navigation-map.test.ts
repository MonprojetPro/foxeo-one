import { describe, it, expect } from 'vitest'
import { ONE_NAVIGATION_MAP } from './one-navigation-map'

describe('ONE_NAVIGATION_MAP (Story 8.7 — Task 5)', () => {
  it('Task 5.2 — réfère aux onglets de base par leur libellé visible', () => {
    expect(ONE_NAVIGATION_MAP).toContain('Tableau de bord')
    expect(ONE_NAVIGATION_MAP).toContain('Documents')
    expect(ONE_NAVIGATION_MAP).toContain('Support')
    expect(ONE_NAVIGATION_MAP).toContain('Chat MiKL')
    expect(ONE_NAVIGATION_MAP).toContain('Chat Élio')
  })

  it('Task 5.2 — mentionne les onglets optionnels par leur libellé', () => {
    expect(ONE_NAVIGATION_MAP).toContain('Comptabilité')
    expect(ONE_NAVIGATION_MAP).toContain('Agenda')
    expect(ONE_NAVIGATION_MAP).toContain('Membres')
    expect(ONE_NAVIGATION_MAP).toContain('SMS')
    expect(ONE_NAVIGATION_MAP).toContain('Présences')
    expect(ONE_NAVIGATION_MAP).toContain('CRM')
  })

  it('Task 5.3 — mentionne la possibilité de demander l\'activation à MiKL', () => {
    expect(ONE_NAVIGATION_MAP).toContain('MiKL')
    expect(ONE_NAVIGATION_MAP).toContain('activer')
  })

  it('ne contient AUCUNE adresse technique /modules/… ni URL', () => {
    expect(ONE_NAVIGATION_MAP).not.toContain('/modules/')
    expect(ONE_NAVIGATION_MAP).not.toContain('/profil')
    expect(ONE_NAVIGATION_MAP).not.toContain('/support')
  })

  it('est une chaîne non vide', () => {
    expect(ONE_NAVIGATION_MAP.trim().length).toBeGreaterThan(0)
  })
})
