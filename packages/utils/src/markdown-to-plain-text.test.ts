import { describe, it, expect } from 'vitest'
import { markdownToPlainText } from './markdown-to-plain-text'

// T-089 — cas reel : le brouillon de relance redige par Elio le 13-11, tel que
// MiKL l'a vu a l'ecran. Il serait parti au client avec ses `##` et ses `**`.
const BROUILLON_ELIO = `## Email de relance — Niveau 1 (J+7)

---

Bonjour test,

J'espère que vous allez bien. Je me permets de vous contacter au sujet de la facture **DEMO-RELANCE** d'un montant de **120 €**, émise le 7 octobre 2026, qui n'a pas encore été réglée à ce jour.

Bien cordialement,
**MiKL**

---

> 💡 *Relance douce — 7 jours de retard*`

describe('markdownToPlainText (T-089)', () => {
  it('nettoie le brouillon reel sans perdre un mot', () => {
    const texte = markdownToPlainText(BROUILLON_ELIO)

    // Plus aucune notation visible
    expect(texte).not.toContain('**')
    expect(texte).not.toContain('##')
    expect(texte).not.toContain('---')
    expect(texte).not.toMatch(/^>/m)

    // Le contenu, lui, est intact
    expect(texte).toContain('Email de relance — Niveau 1 (J+7)')
    expect(texte).toContain('Bonjour test,')
    expect(texte).toContain('DEMO-RELANCE')
    expect(texte).toContain('120 €')
    expect(texte).toContain('MiKL')
    expect(texte).toContain('Relance douce — 7 jours de retard')
  })

  it('retire les titres en gardant leur texte', () => {
    expect(markdownToPlainText('# Titre\n## Sous-titre')).toBe('Titre\nSous-titre')
  })

  it('retire gras et italique', () => {
    expect(markdownToPlainText("du **gras**, de l'*italique* et du ***deux***")).toBe(
      "du gras, de l'italique et du deux"
    )
  })

  it('garde le texte d un lien et jette l adresse', () => {
    expect(markdownToPlainText('Voir [la facture](https://exemple.fr/f/1)')).toBe('Voir la facture')
  })

  it('garde la description d une image', () => {
    expect(markdownToPlainText('![Logo MonprojetPro](https://x/y.png)')).toBe('Logo MonprojetPro')
  })

  it('retire les puces et la numerotation', () => {
    expect(markdownToPlainText('- un\n- deux')).toBe('un\ndeux')
    expect(markdownToPlainText('1. un\n2. deux')).toBe('un\ndeux')
  })

  it('garde le code sans ses accents graves', () => {
    expect(markdownToPlainText('Lance `npm test` pour voir')).toBe('Lance npm test pour voir')
    expect(markdownToPlainText('```js\nconst x = 1\n```')).toBe('const x = 1')
  })

  it('ne casse pas un nom technique avec des tirets bas', () => {
    expect(markdownToPlainText('la colonne paid_on_date est posee')).toBe(
      'la colonne paid_on_date est posee'
    )
  })

  it('laisse un texte sans notation parfaitement intact', () => {
    const simple = "Bonjour, votre facture de 120 € n'est pas réglée. Merci !"
    expect(markdownToPlainText(simple)).toBe(simple)
  })

  it('accepte le vide sans broncher', () => {
    expect(markdownToPlainText('')).toBe('')
    expect(markdownToPlainText(null)).toBe('')
    expect(markdownToPlainText(undefined)).toBe('')
  })
})
