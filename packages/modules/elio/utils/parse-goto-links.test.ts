import { describe, it, expect } from 'vitest'
import { parseGotoLinks } from './parse-goto-links'

describe('parseGotoLinks', () => {
  it('retourne le texte intact et aucun lien quand il n\'y a pas de jeton', () => {
    const { text, links } = parseGotoLinks('Bonjour, comment puis-je aider ?')
    expect(text).toBe('Bonjour, comment puis-je aider ?')
    expect(links).toEqual([])
  })

  it('extrait un jeton valide et le retire du texte', () => {
    const { text, links } = parseGotoLinks(
      'Vos factures sont dans Comptabilité. [[goto:facturation|Ouvrir ma comptabilité]]'
    )
    expect(links).toHaveLength(1)
    expect(links[0]).toEqual({
      key: 'facturation',
      label: 'Ouvrir ma comptabilité',
      href: '/modules/facturation',
    })
    expect(text).toBe('Vos factures sont dans Comptabilité.')
    expect(text).not.toContain('[[goto')
  })

  it('mappe tableau-de-bord vers la racine', () => {
    const { links } = parseGotoLinks('Voir [[goto:tableau-de-bord|Mon tableau de bord]]')
    expect(links[0]?.href).toBe('/')
  })

  it('ignore une CLE inconnue mais retire quand même le jeton du texte', () => {
    const { text, links } = parseGotoLinks('Va voir [[goto:inexistant|Quelque part]] stp')
    expect(links).toEqual([])
    expect(text).not.toContain('[[goto')
    expect(text).toContain('Va voir')
    expect(text).toContain('stp')
  })

  it('déduplique les jetons identiques', () => {
    const { links } = parseGotoLinks(
      '[[goto:documents|Mes docs]] et encore [[goto:documents|Mes docs]]'
    )
    expect(links).toHaveLength(1)
  })

  it('gère plusieurs jetons distincts', () => {
    const { links } = parseGotoLinks(
      '[[goto:chat|Chat MiKL]] ou [[goto:visio|Réserver une visio]]'
    )
    expect(links.map((l) => l.key)).toEqual(['chat', 'visio'])
  })
})
