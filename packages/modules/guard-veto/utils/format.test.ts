// ============================================================
// T-082 — « je ne sais pas » ne doit jamais devenir « zéro »
// ============================================================

import { describe, it, expect } from 'vitest'
import { ETATS, formatEuros, formatJour, libelleEquipe, libellePeriode } from './format'

describe('libelleEquipe', () => {
  it('dit que l’équipe est ILLISIBLE quand le guichet n’a pas pu lire les comptes', () => {
    // Le piège : rendre « 0 compte actif » ferait croire à un cabinet vide.
    expect(libelleEquipe(null)).toBe('Équipe illisible')
  })

  it('ne mentionne les invitations et les fiches sans compte que s’il y en a', () => {
    expect(
      libelleEquipe({
        vetosActifs: 3,
        secretariatActif: 1,
        comptesActifs: 4,
        invitationsEnAttente: 0,
        sansCompte: 0,
      }),
    ).toBe('4 compte(s) actif(s)')

    expect(
      libelleEquipe({
        vetosActifs: 3,
        secretariatActif: 1,
        comptesActifs: 2,
        invitationsEnAttente: 1,
        sansCompte: 1,
      }),
    ).toBe('2 compte(s) actif(s) · 1 en attente · 1 sans compte')
  })
})

describe('dates et montants', () => {
  it('rend « — » plutôt qu’une date inventée quand on ne sait pas', () => {
    expect(formatJour(null)).toBe('—')
    expect(libellePeriode(null)).toBe('—')
  })

  it('affiche les centimes en euros', () => {
    // Les séparateurs français sont des espaces insécables : on les normalise
    // avant de comparer, sinon le test échoue sur un caractère invisible.
    const normaliser = (s: string) =>
      s
        .split(String.fromCharCode(160))
        .join(' ')
        .split(String.fromCharCode(8239))
        .join(' ')
    expect(normaliser(formatEuros(287880))).toBe(['2 878,80', '€'].join(' '))
    expect(normaliser(formatEuros(0))).toBe(['0,00', '€'].join(' '))
  })
})

describe('les 4 états de compte', () => {
  it('ont tous un libellé ET une explication — un état sans phrase laisse MiKL deviner', () => {
    for (const [cle, etat] of Object.entries(ETATS)) {
      expect(etat.label, cle).toBeTruthy()
      expect(etat.aide.length, cle).toBeGreaterThan(10)
    }
  })

  it('couvre exactement les 4 états rendus par le guichet, ni plus ni moins', () => {
    expect(Object.keys(ETATS).sort()).toEqual([
      'actif',
      'invitation_en_attente',
      'mot_de_passe_a_choisir',
      'sans_compte',
    ])
  })
})
