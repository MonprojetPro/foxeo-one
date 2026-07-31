import { describe, it, expect } from 'vitest'
import { isElioOwned } from './read-only-banner-slot'

/**
 * Le bandeau « abonnement terminé » ne doit JAMAIS disparaître d'un écran où personne
 * d'autre ne dit au client que son espace est figé. Ces tests gardent la frontière :
 * un écran de trop dans ELIO_OWNED_ROUTES = un client résilié sans aucune indication.
 */
describe('isElioOwned — écrans dont Élio porte le message', () => {
  it('masque le bandeau sur l\'accueil One (OneConciergeBanner le dit)', () => {
    expect(isElioOwned('/')).toBe(true)
  })

  it('masque le bandeau sur le parcours Lab, le détail d\'étape et le formulaire de soumission', () => {
    expect(isElioOwned('/modules/parcours')).toBe(true)
    expect(isElioOwned('/modules/parcours/steps/3')).toBe(true)
    expect(isElioOwned('/modules/parcours/steps/3/submit')).toBe(true)
  })

  it('GARDE le bandeau sur la consultation d\'une soumission — personne n\'y parle', () => {
    // Page de lecture pure : ni Élio, ni bandeau d'étape, ni message de soumission.
    // Sans cette exception, le préfixe /modules/parcours l'aurait masquée.
    expect(isElioOwned('/modules/parcours/steps/3/submission')).toBe(false)
  })

  it('masque le bandeau sur le chat Élio', () => {
    expect(isElioOwned('/modules/elio')).toBe(true)
  })

  it('GARDE le bandeau partout où Élio ne parle pas', () => {
    for (const route of [
      '/modules/documents',
      '/modules/documents/abc-123',
      '/modules/chat',
      '/modules/facturation',
      '/modules/support',
      '/modules/suivi-outil',
      '/modules/visio',
      '/settings',
      '/settings/billing',
      '/help',
    ]) {
      expect(isElioOwned(route), `${route} doit garder le bandeau`).toBe(false)
    }
  })

  it('ne confond pas un préfixe de route avec la route elle-même', () => {
    // '/modules/elio-quelquechose' n'est pas '/modules/elio'
    expect(isElioOwned('/modules/elio-autre')).toBe(false)
    expect(isElioOwned('/modules/parcours-archive')).toBe(false)
  })

  it('ne masque pas tout l\'espace à cause de la racine « / »', () => {
    // Piège classique : startsWith('/') est vrai partout. Seule l'égalité compte.
    expect(isElioOwned('/modules/documents')).toBe(false)
  })
})
