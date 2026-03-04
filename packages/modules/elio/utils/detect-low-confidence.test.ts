import { describe, it, expect } from 'vitest'
import { detectLowConfidence } from './detect-low-confidence'

describe('detectLowConfidence (Story 8.7 — Task 10)', () => {
  describe('détecte la faible confiance', () => {
    it('Task 10.1 — détecte "je ne suis pas sûr"', () => {
      expect(detectLowConfidence('Je ne suis pas sûr de cela.')).toBe(true)
    })

    it('Task 10.1 — détecte "je ne suis pas certain"', () => {
      expect(detectLowConfidence('Je ne suis pas certain de pouvoir vous aider.')).toBe(true)
    })

    it('Task 10.1 — détecte "peut-être"', () => {
      expect(detectLowConfidence('Peut-être que vous devriez vérifier avec MiKL.')).toBe(true)
    })

    it('Task 10.1 — détecte "il est possible que"', () => {
      expect(detectLowConfidence("Il est possible que ce module n'existe pas.")).toBe(true)
    })

    it('Task 10.1 — détecte "je pense que...mais" (hésitation)', () => {
      expect(detectLowConfidence('Je pense que cette fonctionnalité existe, mais je ne suis pas sûr de son emplacement.')).toBe(true)
    })

    it('Task 10.1 — ne détecte pas "je pense que" seul (assertif)', () => {
      expect(detectLowConfidence('Je pense que vous devriez configurer le module facturation.')).toBe(false)
    })

    it('Task 10.1 — détecte "probablement"', () => {
      expect(detectLowConfidence('C\'est probablement dans /modules/facturation.')).toBe(true)
    })

    it('Task 10.1 — détecte "je ne connais pas"', () => {
      expect(detectLowConfidence('Je ne connais pas cette fonctionnalité spécifique.')).toBe(true)
    })

    it("Task 10.1 — détecte \"je n'ai pas accès\"", () => {
      expect(detectLowConfidence("Je n'ai pas accès à cette information.")).toBe(true)
    })

    it('Task 10.1 — insensible à la casse', () => {
      expect(detectLowConfidence('JE NE SUIS PAS SÛR.')).toBe(true)
    })
  })

  describe('ne détecte pas de faible confiance pour des réponses sûres', () => {
    it('retourne false pour une réponse directe', () => {
      expect(detectLowConfidence('Vos factures se trouvent dans /modules/facturation.')).toBe(false)
    })

    it('retourne false pour un message de guidage clair', () => {
      expect(detectLowConfidence('Pour créer un événement, rendez-vous dans /modules/agenda puis cliquez sur "Nouvel événement".')).toBe(false)
    })

    it('retourne false pour une réponse vide', () => {
      expect(detectLowConfidence('')).toBe(false)
    })

    it('retourne false pour un message de salutation', () => {
      expect(detectLowConfidence('Bonjour ! Comment puis-je vous aider ?')).toBe(false)
    })
  })
})
