import { describe, it, expect } from 'vitest'
import { PALETTE_CLASSES, PALETTE_FOCUS_RING, HEADER_LABELS, HUB_PLACEHOLDER_DEFAULT } from './elio-chat'

describe('elio-chat — config Hub (Story 8.5)', () => {
  describe('PALETTE_CLASSES', () => {
    it('Task 1.1 — applique la classe elio-palette-hub pour dashboardType=hub', () => {
      expect(PALETTE_CLASSES['hub']).toBe('elio-palette-hub')
    })

    it('applique la classe correcte pour chaque dashboard', () => {
      expect(PALETTE_CLASSES['lab']).toBe('elio-palette-lab')
      expect(PALETTE_CLASSES['one']).toBe('elio-palette-one')
    })
  })

  describe('PALETTE_FOCUS_RING', () => {
    it('définit un focus ring cyan/turquoise pour Hub', () => {
      expect(PALETTE_FOCUS_RING['hub']).toContain('ring')
      expect(PALETTE_FOCUS_RING['hub']).toContain('190') // hue cyan/turquoise OKLCH
    })
  })

  describe('HEADER_LABELS', () => {
    it('Task 1.2 — retourne le titre Hub "Élio Hub — Votre assistant"', () => {
      expect(HEADER_LABELS['hub']).toBe('Élio Hub — Votre assistant')
    })

    it('retourne des titres pour Lab et One', () => {
      expect(HEADER_LABELS['lab']).toBeTruthy()
      expect(HEADER_LABELS['one']).toBeTruthy()
    })
  })

  describe('HUB_PLACEHOLDER_DEFAULT', () => {
    it('Task 1.3 — retourne le placeholder Hub spécifique', () => {
      expect(HUB_PLACEHOLDER_DEFAULT).toBe("Demande-moi n'importe quoi sur Foxeo...")
    })
  })
})
