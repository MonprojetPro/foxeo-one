import { describe, it, expect } from 'vitest'
import { parseGotoLinks, GOTO_ROUTES } from './parse-goto-links'

describe('parseGotoLinks', () => {
  it('retourne le texte intact et aucun lien quand il n\'y a pas de jeton', () => {
    const { text, links } = parseGotoLinks('Bonjour, comment puis-je aider ?')
    expect(text).toBe('Bonjour, comment puis-je aider ?')
    expect(links).toEqual([])
  })

  it('extrait un jeton valide et le retire du texte', () => {
    const { text, links } = parseGotoLinks(
      'Vos factures sont dans Paramètres → Mes factures. [[goto:facturation|Voir mes factures]]'
    )
    expect(links).toHaveLength(1)
    expect(links[0]).toEqual({
      key: 'facturation',
      label: 'Voir mes factures',
      href: '/settings/billing',
    })
    expect(text).toBe('Vos factures sont dans Paramètres → Mes factures.')
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

  it('gère les clés à tiret (suivi-outil)', () => {
    const { links } = parseGotoLinks('L\'avancement est là. [[goto:suivi-outil|Voir le suivi]]')
    expect(links[0]?.href).toBe('/modules/suivi-outil')
  })

  it('ignore les anciennes clés mortes (elio, crm, agenda, membres, sms, presences) et retire leurs jetons', () => {
    for (const key of ['elio', 'crm', 'agenda', 'membres', 'sms', 'presences']) {
      const { text, links } = parseGotoLinks(`Va voir [[goto:${key}|Ouvrir]]`)
      expect(links).toEqual([])
      expect(text).not.toContain('[[goto')
    }
  })

  it('GOTO_ROUTES ne référence que des pages client existantes', () => {
    // Pages réelles de apps/client/app/(dashboard) — si une page bouge, mettre à jour ici ET GOTO_ROUTES.
    const EXISTING_CLIENT_ROUTES = new Set([
      '/',
      '/modules/chat',
      '/modules/documents',
      '/modules/visio',
      '/modules/suivi-outil',
      '/modules/support',
      '/settings',
      '/settings/billing',
    ])
    for (const [key, route] of Object.entries(GOTO_ROUTES)) {
      expect(EXISTING_CLIENT_ROUTES.has(route), `clé "${key}" → route inconnue "${route}"`).toBe(true)
    }
  })
})
