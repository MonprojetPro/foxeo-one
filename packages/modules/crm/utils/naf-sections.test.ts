import { describe, it, expect } from 'vitest'
import { isValidSiret, nafSectionLabel, normalizeSiret } from './naf-sections'

describe('normalizeSiret', () => {
  it('ne garde que les chiffres', () => {
    expect(normalizeSiret('400 730 529 00023')).toBe('40073052900023')
    expect(normalizeSiret('400-730-529-00023')).toBe('40073052900023')
  })
})

describe('isValidSiret', () => {
  it('accepte un SIRET réel (HABITAT 77, vérifié via le répertoire Sirene)', () => {
    expect(isValidSiret('40073052900023')).toBe(true)
  })

  it('refuse un SIRET dont la clé de Luhn est fausse', () => {
    // Même numéro, dernier chiffre changé.
    expect(isValidSiret('40073052900024')).toBe(false)
  })

  it('refuse autre chose que 14 chiffres', () => {
    expect(isValidSiret('400730529')).toBe(false)
    expect(isValidSiret('4007305290002A')).toBe(false)
    expect(isValidSiret('')).toBe(false)
  })

  it('accepte les SIRET de La Poste, exclus de la règle de Luhn par l’INSEE', () => {
    expect(isValidSiret('35600000000048')).toBe(true)
  })
})

describe('nafSectionLabel', () => {
  it('traduit la lettre de section en libellé lisible', () => {
    expect(nafSectionLabel('L')).toBe('Activités immobilières')
    expect(nafSectionLabel('j')).toBe('Information et communication')
  })

  it('rend undefined sur une section absente ou inconnue', () => {
    expect(nafSectionLabel(null)).toBeUndefined()
    expect(nafSectionLabel('ZZ')).toBeUndefined()
  })
})
