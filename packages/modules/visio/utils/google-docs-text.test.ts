import { describe, it, expect } from 'vitest'
import { extractGoogleDocsText, parseGoogleDocumentId } from './google-docs-text'

function paragraph(...texts: string[]) {
  return { paragraph: { elements: texts.map((t) => ({ textRun: { content: t } })) } }
}

describe('extractGoogleDocsText', () => {
  it('extrait le texte des paragraphes dans l’ordre', () => {
    const doc = {
      body: {
        content: [
          paragraph('Transcript — Point coaching\n'),
          paragraph('MiKL : Bonjour, on attaque le pricing.\n'),
          paragraph('Client : Parfait, ', 'allons-y.\n'),
        ],
      },
    }
    expect(extractGoogleDocsText(doc)).toBe(
      'Transcript — Point coaching\nMiKL : Bonjour, on attaque le pricing.\nClient : Parfait, allons-y.',
    )
  })

  it('extrait aussi le texte des cellules de tableaux (imbriqués)', () => {
    const doc = {
      body: {
        content: [
          {
            table: {
              tableRows: [
                { tableCells: [{ content: [paragraph('Cellule A. ')] }, { content: [paragraph('Cellule B.')] }] },
              ],
            },
          },
        ],
      },
    }
    expect(extractGoogleDocsText(doc)).toBe('Cellule A. Cellule B.')
  })

  it('retourne null pour un document vide ou une structure inattendue', () => {
    expect(extractGoogleDocsText(null)).toBeNull()
    expect(extractGoogleDocsText('pas un objet')).toBeNull()
    expect(extractGoogleDocsText({})).toBeNull()
    expect(extractGoogleDocsText({ body: { content: [] } })).toBeNull()
    expect(extractGoogleDocsText({ body: { content: [paragraph('   \n ')] } })).toBeNull()
  })

  it('tronque au-delà de maxLength (défaut ~50 000)', () => {
    const doc = { body: { content: [paragraph('a'.repeat(60_000))] } }
    expect(extractGoogleDocsText(doc)?.length).toBe(50_000)
    expect(extractGoogleDocsText(doc, 100)?.length).toBe(100)
  })

  it('compacte les sauts de ligne excessifs', () => {
    const doc = { body: { content: [paragraph('Ligne 1\n\n\n\n'), paragraph('Ligne 2')] } }
    expect(extractGoogleDocsText(doc)).toBe('Ligne 1\n\nLigne 2')
  })
})

describe('parseGoogleDocumentId', () => {
  it('utilise le champ document en priorité (ID direct)', () => {
    expect(parseGoogleDocumentId({ document: 'abc123', exportUri: 'https://docs.google.com/document/d/other/view' }))
      .toBe('abc123')
  })

  it('strip le préfixe documents/ du resource name', () => {
    expect(parseGoogleDocumentId({ document: 'documents/abc123' })).toBe('abc123')
  })

  it('parse le documentId depuis l’exportUri', () => {
    expect(parseGoogleDocumentId({ exportUri: 'https://docs.google.com/document/d/trans456/view?usp=meet' }))
      .toBe('trans456')
  })

  it('retourne null si aucune source exploitable', () => {
    expect(parseGoogleDocumentId({})).toBeNull()
    expect(parseGoogleDocumentId({ document: '  ', exportUri: 'https://drive.google.com/file/d/x/view' }))
      .toBeNull()
  })
})
