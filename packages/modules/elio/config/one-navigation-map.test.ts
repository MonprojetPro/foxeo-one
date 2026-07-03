import { describe, it, expect } from 'vitest'
import { ONE_NAVIGATION_MAP } from './one-navigation-map'
import { GOTO_ROUTES } from '../utils/parse-goto-links'

describe('ONE_NAVIGATION_MAP (Story 8.7 — Task 5, refonte 2026-07-03)', () => {
  it('réfère aux onglets réels du One par leur libellé visible', () => {
    expect(ONE_NAVIGATION_MAP).toContain('Tableau de bord')
    expect(ONE_NAVIGATION_MAP).toContain('Chat MiKL')
    expect(ONE_NAVIGATION_MAP).toContain('Documents')
    expect(ONE_NAVIGATION_MAP).toContain('Visio')
    expect(ONE_NAVIGATION_MAP).toContain("Suivi de l'outil")
    expect(ONE_NAVIGATION_MAP).toContain('Support')
    expect(ONE_NAVIGATION_MAP).toContain('Paramètres')
    expect(ONE_NAVIGATION_MAP).toContain('Mes factures')
  })

  it('ne décrit plus les onglets périmés comme des onglets du menu', () => {
    // Ces libellés ne doivent plus apparaître en gras (format « onglet du menu »).
    expect(ONE_NAVIGATION_MAP).not.toContain('**Chat Élio**')
    expect(ONE_NAVIGATION_MAP).not.toContain('**Comptabilité**')
    expect(ONE_NAVIGATION_MAP).not.toContain('**CRM**')
    expect(ONE_NAVIGATION_MAP).not.toContain('**Agenda**')
    expect(ONE_NAVIGATION_MAP).not.toContain('**Membres**')
    expect(ONE_NAVIGATION_MAP).not.toContain('**SMS**')
    expect(ONE_NAVIGATION_MAP).not.toContain('**Présences**')
    expect(ONE_NAVIGATION_MAP).not.toContain('Onglets optionnels')
  })

  it('les CLE de deep-linking annoncées à Élio sont exactement celles de GOTO_ROUTES', () => {
    const cleLine = ONE_NAVIGATION_MAP
      .split('\n')
      .find((l) => l.includes('La CLE doit être'))
    expect(cleLine).toBeDefined()
    const announced = (cleLine ?? '')
      .replace(/^.*:\s*/, '')
      .replace(/\.$/, '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .sort()
    expect(announced).toEqual(Object.keys(GOTO_ROUTES).sort())
  })

  it('ne référence aucune ancienne CLE morte dans la consigne deep-linking', () => {
    for (const dead of ['elio', 'crm', 'agenda', 'membres', 'sms', 'presences']) {
      expect(GOTO_ROUTES[dead]).toBeUndefined()
    }
  })

  it('mentionne la possibilité de demander l\'activation à MiKL', () => {
    expect(ONE_NAVIGATION_MAP).toContain('MiKL')
    expect(ONE_NAVIGATION_MAP).toContain('activer')
  })

  it('ne contient AUCUNE adresse technique /modules/… ni URL', () => {
    expect(ONE_NAVIGATION_MAP).not.toContain('/modules/')
    expect(ONE_NAVIGATION_MAP).not.toContain('/settings')
    expect(ONE_NAVIGATION_MAP).not.toContain('/profil')
    expect(ONE_NAVIGATION_MAP).not.toContain('/support')
  })

  it('est une chaîne non vide', () => {
    expect(ONE_NAVIGATION_MAP.trim().length).toBeGreaterThan(0)
  })
})
