import { describe, it, expect } from 'vitest'
import { lastNightlyCutoff, hasCrossedNightlyCutoff } from './session-cutoff'

// Rappel de lecture : en été Paris est à UTC+2, en hiver à UTC+1.
// 2 h locales = 00:00Z en été, 01:00Z en hiver.

describe('lastNightlyCutoff', () => {
  it('renvoie la coupure du jour meme quand il est plus tard que 2h (ete)', () => {
    // 4 août 2026, 14 h à Paris (12:00Z)
    const cutoff = lastNightlyCutoff(new Date('2026-08-04T12:00:00Z'))
    expect(cutoff.toISOString()).toBe('2026-08-04T00:00:00.000Z')
  })

  it('renvoie la coupure de la veille quand il est avant 2h (ete)', () => {
    // 4 août 2026, 1 h à Paris (23:00Z la veille) — la nuit n'a pas encore basculé
    const cutoff = lastNightlyCutoff(new Date('2026-08-03T23:00:00Z'))
    expect(cutoff.toISOString()).toBe('2026-08-03T00:00:00.000Z')
  })

  it('tient compte de l heure d hiver', () => {
    // 15 janvier 2026, 14 h à Paris (13:00Z) → 2 h locales = 01:00Z
    const cutoff = lastNightlyCutoff(new Date('2026-01-15T13:00:00Z'))
    expect(cutoff.toISOString()).toBe('2026-01-15T01:00:00.000Z')
  })

  it('gere le passage de mois', () => {
    // 1er septembre 2026, 0 h 30 à Paris (2026-08-31T22:30Z)
    const cutoff = lastNightlyCutoff(new Date('2026-08-31T22:30:00Z'))
    expect(cutoff.toISOString()).toBe('2026-08-31T00:00:00.000Z')
  })
})

describe('hasCrossedNightlyCutoff', () => {
  it('coupe une session ouverte la veille', () => {
    // Le cas de MiKL : session du 3 août 10h54, encore ouverte le 4 août
    const started = new Date('2026-08-03T10:54:00Z')
    const now = new Date('2026-08-04T09:00:00Z')
    expect(hasCrossedNightlyCutoff(started, now)).toBe(true)
  })

  it('laisse tranquille une session ouverte le matin meme', () => {
    const started = new Date('2026-08-04T07:00:00Z')
    const now = new Date('2026-08-04T18:00:00Z')
    expect(hasCrossedNightlyCutoff(started, now)).toBe(false)
  })

  it('laisse travailler tard sans couper avant 2h', () => {
    // Session ouverte à 22 h, on est à 1 h du matin : la coupure n'est pas passée
    const started = new Date('2026-08-03T20:00:00Z') // 22 h Paris
    const now = new Date('2026-08-03T23:00:00Z') // 1 h Paris le 4
    expect(hasCrossedNightlyCutoff(started, now)).toBe(false)
  })

  it('coupe la session de veille tardive des que 2h est passe', () => {
    // Même session qu'au-dessus, mais il est 2 h 30 du matin
    const started = new Date('2026-08-03T20:00:00Z') // 22 h Paris
    const now = new Date('2026-08-04T00:30:00Z') // 2 h 30 Paris
    expect(hasCrossedNightlyCutoff(started, now)).toBe(true)
  })

  it('coupe une session de plusieurs jours', () => {
    const started = new Date('2026-07-27T08:41:00Z')
    const now = new Date('2026-08-04T09:00:00Z')
    expect(hasCrossedNightlyCutoff(started, now)).toBe(true)
  })

  it('ne coupe pas une session ouverte juste apres la coupure', () => {
    const started = new Date('2026-08-04T00:05:00Z') // 2 h 05 Paris
    const now = new Date('2026-08-04T08:00:00Z')
    expect(hasCrossedNightlyCutoff(started, now)).toBe(false)
  })
})
