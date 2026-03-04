import { describe, it, expect } from 'vitest'
import { detectIntent } from './detect-intent'

describe('detectIntent (Story 8.5 — Task 6)', () => {
  describe('action: search_client (AC3, FR23)', () => {
    it('Task 6.2 — détecte "où en est X ?"', () => {
      const intent = detectIntent('Où en est Sandrine ?')
      expect(intent.action).toBe('search_client')
      expect(intent.query?.toLowerCase()).toContain('sandrine')
    })

    it('Task 6.2 — détecte "quel est le parcours de X ?"', () => {
      const intent = detectIntent('Quel est le parcours de Thomas ?')
      expect(intent.action).toBe('search_client')
      expect(intent.query?.toLowerCase()).toContain('thomas')
    })

    it('Task 6.2 — détecte "infos sur X"', () => {
      const intent = detectIntent('infos sur Marie')
      expect(intent.action).toBe('search_client')
      expect(intent.query?.toLowerCase()).toContain('marie')
    })

    it('Task 6.2 — détecte "infos client X"', () => {
      const intent = detectIntent('infos client Dupont')
      expect(intent.action).toBe('search_client')
      expect(intent.query?.toLowerCase()).toContain('dupont')
    })

    it('Task 6.3 — extrait correctement le query (dernier groupe de capture)', () => {
      const intent = detectIntent('recherche Alice Martin')
      expect(intent.action).toBe('search_client')
      expect(intent.query).toBeTruthy()
    })
  })

  describe('action: help_feature (AC2, FR22)', () => {
    it('Task 6.2 — détecte "comment je crée un nouveau client ?"', () => {
      const intent = detectIntent('Comment je crée un nouveau client ?')
      expect(intent.action).toBe('help_feature')
    })

    it('Task 6.2 — détecte "où je vois les demandes ?"', () => {
      const intent = detectIntent('Où je vois les demandes en attente ?')
      expect(intent.action).toBe('help_feature')
    })

    it("Task 6.2 — détecte \"c'est quoi la validation hub ?\"", () => {
      const intent = detectIntent("c'est quoi la validation hub ?")
      expect(intent.action).toBe('help_feature')
    })
  })

  describe('action: general', () => {
    it('retourne general pour un message sans pattern reconnu', () => {
      const intent = detectIntent('Bonjour Élio !')
      expect(intent.action).toBe('general')
    })

    it('retourne general pour un message de conversation générale', () => {
      const intent = detectIntent('Merci pour ton aide')
      expect(intent.action).toBe('general')
    })

    it('retourne général pour un message vide', () => {
      const intent = detectIntent('')
      expect(intent.action).toBe('general')
    })
  })
})
