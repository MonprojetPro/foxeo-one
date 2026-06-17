import { describe, it, expect } from 'vitest'
import { LAB_NAVIGATION_MAP } from './lab-navigation-map'

describe('LAB_NAVIGATION_MAP', () => {
  it('réfère aux onglets par leur libellé visible (pas d\'URL technique)', () => {
    expect(LAB_NAVIGATION_MAP).toContain('Mon Parcours')
    expect(LAB_NAVIGATION_MAP).toContain('Chat MiKL')
    expect(LAB_NAVIGATION_MAP).toContain('Visio')
    expect(LAB_NAVIGATION_MAP).toContain('Documents')
    expect(LAB_NAVIGATION_MAP).toContain('Comptabilité')
    expect(LAB_NAVIGATION_MAP).toContain('Paramètres → Consentements')
  })

  it('ne contient AUCUNE adresse technique /modules/…', () => {
    expect(LAB_NAVIGATION_MAP).not.toContain('/modules/')
    expect(LAB_NAVIGATION_MAP).not.toContain('/settings/')
  })

  it('explique la pause des agents et la disponibilité du Concierge', () => {
    expect(LAB_NAVIGATION_MAP).toContain('pause')
    expect(LAB_NAVIGATION_MAP).toContain('Concierge')
  })

  it('mentionne le pilotage par MiKL et la graduation One', () => {
    expect(LAB_NAVIGATION_MAP).toContain('MiKL')
    expect(LAB_NAVIGATION_MAP).toContain('One')
  })

  it('ne se confond pas avec la nav One (header distinct)', () => {
    expect(LAB_NAVIGATION_MAP).not.toContain('Navigation dashboard One')
    expect(LAB_NAVIGATION_MAP).toContain('Navigation du dashboard Lab')
  })

  it('est une chaîne non vide', () => {
    expect(LAB_NAVIGATION_MAP.trim().length).toBeGreaterThan(0)
  })
})
