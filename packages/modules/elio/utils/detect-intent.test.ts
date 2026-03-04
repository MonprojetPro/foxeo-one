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

describe('detectIntent (Story 8.6 — Task 1)', () => {
  describe('action: correct_text (AC1)', () => {
    it('Task 1.2 — détecte "Corrige ça pour Thomas : ..."', () => {
      const intent = detectIntent('Corrige ça pour Thomas : salu thomas, je tenvoi le devis')
      expect(intent.action).toBe('correct_text')
      expect(intent.clientName?.toLowerCase()).toContain('thomas')
    })

    it('Task 1.2 — détecte "Corrige ce texte pour Marie : ..."', () => {
      const intent = detectIntent('Corrige ce texte pour Marie : Bonjour je reviens vers toi')
      expect(intent.action).toBe('correct_text')
      expect(intent.clientName?.toLowerCase()).toContain('marie')
    })

    it('Task 1.2 — détecte "Adapte ce texte pour Sandrine : ..."', () => {
      const intent = detectIntent('Adapte ce texte pour Sandrine : Voici le devis demandé.')
      expect(intent.action).toBe('correct_text')
      expect(intent.clientName?.toLowerCase()).toContain('sandrine')
    })

    it('Task 1.4 — extrait correctement le originalText après ":"', () => {
      const intent = detectIntent('Corrige ça pour Thomas : salu thomas, je tenvoi le devis cmme convenu')
      expect(intent.action).toBe('correct_text')
      expect(intent.originalText).toBeTruthy()
      expect(intent.originalText?.toLowerCase()).toContain('salu')
    })

    it('Task 1.4 — extrait clientName sans le texte après ":"', () => {
      const intent = detectIntent('Corrige ça pour Thomas : texte ici')
      expect(intent.clientName).toBe('Thomas')
    })

    it('Task 1.2 — détecte "Corrige pour Alice : ..."', () => {
      const intent = detectIntent('Corrige pour Alice : Ce texte a des erreurs')
      expect(intent.action).toBe('correct_text')
      expect(intent.clientName?.toLowerCase()).toContain('alice')
    })
  })

  describe('action: generate_draft (AC2)', () => {
    it('Task 1.3 — détecte "Génère un email pour Sandrine"', () => {
      const intent = detectIntent('Génère un email pour Sandrine pour lui dire que son devis est prêt')
      expect(intent.action).toBe('generate_draft')
      expect(intent.clientName?.toLowerCase()).toContain('sandrine')
      expect(intent.draftType).toBe('email')
    })

    it('Task 1.3 — détecte "Génère une réponse Validation Hub pour Thomas"', () => {
      const intent = detectIntent('Écris une réponse Validation Hub pour Thomas')
      expect(intent.action).toBe('generate_draft')
      expect(intent.clientName?.toLowerCase()).toContain('thomas')
      expect(intent.draftType).toBe('validation_hub')
    })

    it('Task 1.3 — détecte "Génère un message pour Marie"', () => {
      const intent = detectIntent('Génère un message pour Marie')
      expect(intent.action).toBe('generate_draft')
      expect(intent.clientName?.toLowerCase()).toContain('marie')
    })

    it('Task 1.3 — détecte "Écris un brouillon pour Alice"', () => {
      const intent = detectIntent('Écris un brouillon pour Alice')
      expect(intent.action).toBe('generate_draft')
      expect(intent.clientName?.toLowerCase()).toContain('alice')
    })

    it('Task 1.4 — extrait draftType email', () => {
      const intent = detectIntent('Génère un email pour Sandrine')
      expect(intent.draftType).toBe('email')
    })

    it('Task 1.4 — draftType par défaut = chat si non spécifié', () => {
      const intent = detectIntent('Écris une réponse pour Thomas')
      expect(intent.action).toBe('generate_draft')
      expect(intent.draftType).toBe('chat')
    })

    it('Task 1.4 — extrait draftSubject du message', () => {
      const intent = detectIntent('Génère un email pour Sandrine pour lui dire que son devis est prêt')
      expect(intent.action).toBe('generate_draft')
      expect(intent.draftSubject).toBeTruthy()
    })
  })

  describe('action: adjust_draft (AC3)', () => {
    it('Task 6.1 — détecte "Plus court"', () => {
      const intent = detectIntent('Plus court')
      expect(intent.action).toBe('adjust_draft')
    })

    it('Task 6.1 — détecte "Plus long"', () => {
      const intent = detectIntent('Plus long')
      expect(intent.action).toBe('adjust_draft')
    })

    it('Task 6.1 — détecte "Ajoute la date de livraison"', () => {
      const intent = detectIntent('Ajoute la date de livraison')
      expect(intent.action).toBe('adjust_draft')
    })

    it('Task 6.1 — détecte "Passe au tutoiement"', () => {
      const intent = detectIntent('Passe au tutoiement')
      expect(intent.action).toBe('adjust_draft')
    })

    it('Task 6.1 — détecte "Rends-le plus formel"', () => {
      const intent = detectIntent('Rends-le plus formel')
      expect(intent.action).toBe('adjust_draft')
    })

    it('Task 6.1 — détecte "Enlève la signature"', () => {
      const intent = detectIntent('Enlève la signature')
      expect(intent.action).toBe('adjust_draft')
    })
  })
})
