import { describe, it, expect } from 'vitest'
import { LAB_NAVIGATION_MAP } from './lab-navigation-map'

describe('LAB_NAVIGATION_MAP', () => {
  it('contient les routes clés du dashboard Lab', () => {
    expect(LAB_NAVIGATION_MAP).toContain('/modules/parcours')
    expect(LAB_NAVIGATION_MAP).toContain('/modules/chat')
    expect(LAB_NAVIGATION_MAP).toContain('/modules/visio')
    expect(LAB_NAVIGATION_MAP).toContain('/modules/documents')
    expect(LAB_NAVIGATION_MAP).toContain('/modules/facturation')
    expect(LAB_NAVIGATION_MAP).toContain('/settings/consents')
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
