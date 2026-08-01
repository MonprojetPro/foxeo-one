import { describe, it, expect } from 'vitest'
import { OPERATOR_IDENTITY_RULE, OPERATOR_DISPLAY_NAME } from './operator-identity'

/**
 * Le défaut d'origine ne levait aucune erreur : Élio écrivait « MiKL … elle » une fois
 * sur N, directement au client. Ces tests verrouillent le contenu de la règle — c'est
 * la seule protection possible côté code, la sortie du modèle n'étant pas déterministe.
 */
describe('OPERATOR_IDENTITY_RULE', () => {
  it('déclare explicitement que MiKL est un homme', () => {
    expect(OPERATOR_IDENTITY_RULE).toContain('MiKL')
    expect(OPERATOR_IDENTITY_RULE).toMatch(/c'est un homme/i)
  })

  it('impose le masculin et interdit nommément « elle »', () => {
    expect(OPERATOR_IDENTITY_RULE).toMatch(/masculin/i)
    expect(OPERATOR_IDENTITY_RULE).toMatch(/jamais «\s*elle\s*»/i)
  })

  it('interdit aussi les tournures qui esquivent le genre', () => {
    // Sans ça, un modèle prudent écrit « la personne qui suit ton dossier » — correct
    // mais froid, et ça casse la relation nominative avec MiKL.
    expect(OPERATOR_IDENTITY_RULE).toMatch(/laisse le genre en suspens/i)
  })

  it('demande au modèle d\'appliquer la règle sans la réciter au client', () => {
    expect(OPERATOR_IDENTITY_RULE).toMatch(/jamais cette règle au client/i)
  })

  it('est un bloc injectable : délimité et terminé par un saut de ligne', () => {
    // Concaténé directement à la fin de prompts existants — sans séparation, il se
    // collerait à la dernière phrase du prompt hôte.
    expect(OPERATOR_IDENTITY_RULE.startsWith('\n')).toBe(true)
    expect(OPERATOR_IDENTITY_RULE.endsWith('\n')).toBe(true)
    expect(OPERATOR_IDENTITY_RULE).toContain('=== IDENTITÉ DE L\'OPÉRATEUR')
    expect(OPERATOR_IDENTITY_RULE).toContain('=== FIN IDENTITÉ DE L\'OPÉRATEUR ===')
  })

  it('expose le nom de l\'opérateur avec sa casse exacte', () => {
    expect(OPERATOR_DISPLAY_NAME).toBe('MiKL')
  })
})
