import { describe, it, expect } from 'vitest'
import {
  buildTranscriptDocumentName,
  sanitizeStorageFileName,
  TRANSCRIPT_FOLDER_NAME,
} from './transcript-document'

describe('buildTranscriptDocumentName', () => {
  it('porte le titre ET la date — deux visios du même nom restent distinguables', () => {
    expect(buildTranscriptDocumentName('Point mensuel', '2026-10-15T10:00:00.000Z')).toBe(
      'Transcription — Point mensuel — 2026-10-15.pdf'
    )
  })

  it('utilise le fuseau de Paris, pas UTC', () => {
    // 23 h 30 UTC le 14 = 1 h 30 le 15 à Paris. Dater en UTC ferait apparaître
    // une visio de la nuit sous la veille, et MiKL la chercherait au mauvais jour.
    expect(buildTranscriptDocumentName('Nuit', '2026-10-14T23:30:00.000Z')).toContain('2026-10-15')
  })

  it('reste lisible sans date', () => {
    expect(buildTranscriptDocumentName('Point', null)).toBe('Transcription — Point.pdf')
  })

  it('ne produit jamais un nom vide', () => {
    expect(buildTranscriptDocumentName('   ', null)).toBe('Transcription — Visio.pdf')
  })

  it('prend l’extension txt quand l’export PDF a été refusé', () => {
    expect(buildTranscriptDocumentName('Point', null, 'txt')).toBe('Transcription — Point.txt')
  })
})

describe('sanitizeStorageFileName', () => {
  it('retire accents et espaces — Supabase Storage les refuse', () => {
    expect(sanitizeStorageFileName('Transcription — Réunion été.pdf')).toBe(
      'Transcription-Reunion-ete.pdf'
    )
  })

  it('ne rend jamais une chaîne vide', () => {
    expect(sanitizeStorageFileName('———')).toBe('transcription')
  })
})

describe('TRANSCRIPT_FOLDER_NAME', () => {
  it('est le dossier annoncé à MiKL', () => {
    expect(TRANSCRIPT_FOLDER_NAME).toBe('Comptes rendus de visio')
  })
})
