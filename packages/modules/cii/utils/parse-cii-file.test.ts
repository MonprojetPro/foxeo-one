import { describe, it, expect } from 'vitest'
import { parseCiiFunctionsFile } from './parse-cii-file'

describe('parseCiiFunctionsFile', () => {
  it('parses a line with hours separated by an em-dash', () => {
    const result = parseCiiFunctionsFile('Validation du formulaire de paiement — 2h')
    expect(result).toEqual([
      { functionName: 'Validation du formulaire de paiement', timeRaw: '— 2h', timeDays: 0.25 },
    ])
  })

  it('parses a line with days separated by a colon', () => {
    const result = parseCiiFunctionsFile('Export PDF multi-pages : 1.5j')
    expect(result).toEqual([
      { functionName: 'Export PDF multi-pages', timeRaw: ': 1.5j', timeDays: 1.5 },
    ])
  })

  it('parses a comma decimal separator', () => {
    const result = parseCiiFunctionsFile('Module de synchronisation - 0,5j')
    expect(result[0]!.timeDays).toBe(0.5)
  })

  it('accepts the long unit forms', () => {
    const result = parseCiiFunctionsFile('Moteur de recherche interne 3 jours')
    expect(result[0]).toEqual({ functionName: 'Moteur de recherche interne', timeRaw: '3 jours', timeDays: 3 })
  })

  it('leaves time null when the line has no time indication', () => {
    const result = parseCiiFunctionsFile('Synchronisation calendrier Google')
    expect(result[0]).toEqual({
      functionName: 'Synchronisation calendrier Google',
      timeRaw: null,
      timeDays: null,
    })
  })

  it('ignores empty lines and trims whitespace', () => {
    const result = parseCiiFunctionsFile('\n  Première fonction — 1h  \n\n   \nDeuxième fonction — 2h\n')
    expect(result).toHaveLength(2)
    expect(result[0]!.functionName).toBe('Première fonction')
    expect(result[1]!.functionName).toBe('Deuxième fonction')
  })

  it('returns an empty array for an empty or blank file', () => {
    expect(parseCiiFunctionsFile('')).toEqual([])
    expect(parseCiiFunctionsFile('   \n  \n')).toEqual([])
  })
})
