import { describe, expect, it } from 'vitest'
import { num, shortDate, relativeDate, toCsv } from './format'

describe('num', () => {
  it('distingue « non calculable » de « zéro »', () => {
    expect(num(null)).toBe('—')
    expect(num(undefined)).toBe('—')
    expect(num(0)).toBe('0')
  })

  it('formate les milliers à la française', () => {
    // Espace insécable étroit selon l'ICU — on vérifie les chiffres, pas le séparateur.
    expect(num(12345).replace(/\s| | /g, '')).toBe('12345')
  })
})

describe('dates du guichet', () => {
  // Le guichet renvoie « +00:00 » et non « Z » — les deux doivent être lus pareil.
  const withOffset = '2026-08-01T05:48:53.15334+00:00'
  const withZ = '2026-08-01T05:48:53.153Z'

  it('interprète le format +00:00 comme du Z', () => {
    expect(new Date(withOffset).getTime()).toBeCloseTo(new Date(withZ).getTime(), -1)
    expect(shortDate(withOffset)).toBe(shortDate(withZ))
  })

  it('renvoie un repère lisible plutôt que « Invalid Date »', () => {
    expect(shortDate(null)).toBe('—')
    expect(shortDate('pas-une-date')).toBe('—')
    expect(relativeDate(null)).toBe('jamais')
  })

  it('exprime l’ancienneté en unités croissantes', () => {
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
    expect(relativeDate(ago(30 * 1000))).toBe("à l'instant")
    expect(relativeDate(ago(5 * 60 * 1000))).toBe('il y a 5 min')
    expect(relativeDate(ago(3 * 3600 * 1000))).toBe('il y a 3 h')
    expect(relativeDate(ago(12 * 86400 * 1000))).toBe('il y a 12 j')
    expect(relativeDate(ago(90 * 86400 * 1000))).toBe('il y a 3 mois')
  })
})

describe('toCsv', () => {
  it('sépare par point-virgule et laisse les cellules nulles vides', () => {
    expect(toCsv(['A', 'B'], [['x', null]])).toBe('A;B\r\nx;')
  })

  it('protège les valeurs contenant un séparateur, un guillemet ou un saut de ligne', () => {
    expect(toCsv(['A'], [['a;b']])).toContain('"a;b"')
    expect(toCsv(['A'], [['dit "bonjour"']])).toContain('"dit ""bonjour"""')
    expect(toCsv(['A'], [['ligne1\nligne2']])).toContain('"ligne1\nligne2"')
  })
})
