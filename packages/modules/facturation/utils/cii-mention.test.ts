import { describe, it, expect } from 'vitest'
import {
  buildCiiInvoiceMention,
  buildCiiQuoteMention,
  appendCiiMention,
  CII_RELEVANCE_THRESHOLD_HT,
} from './cii-mention'

describe('cii-mention', () => {
  it('le seuil de pertinence est de 25 000 €', () => {
    expect(CII_RELEVANCE_THRESHOLD_HT).toBe(25000)
  })

  it('la mention facture porte l’agrément et la réserve comptable', () => {
    const mention = buildCiiInvoiceMention()
    expect(mention).toContain('32894818')
    expect(mention).toContain("expert-comptable")
    expect(mention).toContain("INFORMATION CRÉDIT D'IMPÔT INNOVATION (CII)")
  })

  it('la mention devis parle de potentiel, pas de certitude', () => {
    const mention = buildCiiQuoteMention()
    expect(mention).toContain('potentiellement éligible')
    expect(mention).toContain('32894818')
  })

  describe('appendCiiMention', () => {
    it('ajoute la mention a des notes vides', () => {
      expect(appendCiiMention(null, 'MENTION')).toBe('MENTION')
      expect(appendCiiMention('', 'MENTION')).toBe('MENTION')
      expect(appendCiiMention(undefined, 'MENTION')).toBe('MENTION')
    })

    it('ajoute la mention APRES des notes existantes, sans les effacer', () => {
      const result = appendCiiMention('Référence client ABC123', 'MENTION')
      expect(result).toBe('Référence client ABC123\n\nMENTION')
    })

    it('ne duplique pas la mention si elle est deja presente', () => {
      const already = 'Notes\n\nMENTION'
      expect(appendCiiMention(already, 'MENTION')).toBe(already)
    })
  })
})
