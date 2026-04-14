import { describe, it, expect } from 'vitest'
import {
  PALETTE_CLASSES,
  PALETTE_FOCUS_RING,
  HEADER_LABELS,
  HUB_PLACEHOLDER_DEFAULT,
  ONE_PLACEHOLDER_VOUVOIEMENT,
  ONE_PLACEHOLDER_TUTOIEMENT,
} from './elio-chat'

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
      expect(HUB_PLACEHOLDER_DEFAULT).toBe("Demande-moi n'importe quoi sur MonprojetPro...")
    })
  })
})

describe('elio-chat — config One (Story 8.7)', () => {
  describe('Placeholders One adaptés au profil (Task 1.3)', () => {
    it('ONE_PLACEHOLDER_VOUVOIEMENT — utilise le vouvoiement', () => {
      expect(ONE_PLACEHOLDER_VOUVOIEMENT).toContain('vous')
      expect(ONE_PLACEHOLDER_VOUVOIEMENT).toBeTruthy()
    })

    it('ONE_PLACEHOLDER_TUTOIEMENT — utilise le tutoiement', () => {
      expect(ONE_PLACEHOLDER_TUTOIEMENT).toContain('t\'')
      expect(ONE_PLACEHOLDER_TUTOIEMENT).toBeTruthy()
    })

    it('les deux placeholders sont différents', () => {
      expect(ONE_PLACEHOLDER_VOUVOIEMENT).not.toBe(ONE_PLACEHOLDER_TUTOIEMENT)
    })
  })

  describe('HEADER_LABELS One (Task 1.2)', () => {
    it('header One est "Élio — Votre assistant"', () => {
      expect(HEADER_LABELS['one']).toBe('Élio — Votre assistant')
    })
  })

  describe('PALETTE_CLASSES One (Task 1.1)', () => {
    it('applique la classe elio-palette-one', () => {
      expect(PALETTE_CLASSES['one']).toBe('elio-palette-one')
    })
  })
})
