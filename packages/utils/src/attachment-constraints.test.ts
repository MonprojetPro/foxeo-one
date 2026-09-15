import { describe, it, expect } from 'vitest'
import { MAX_ATTACHMENTS, MAX_FILE_BYTES, rejectFile, readableSize, sanitizeFileName } from './attachment-constraints'

function file(name: string, size: number, type: string) {
  return { name, size, type }
}

describe('attachment-constraints', () => {
  it('exposes 3 as the max number of attachments', () => {
    expect(MAX_ATTACHMENTS).toBe(3)
  })

  describe('rejectFile', () => {
    it('accepts a valid PNG', () => {
      expect(rejectFile(file('capture.png', 1024, 'image/png'))).toBeNull()
    })

    it('accepts a PDF', () => {
      expect(rejectFile(file('doc.pdf', 1024, 'application/pdf'))).toBeNull()
    })

    it('accepts HEIC (photos iPhone)', () => {
      expect(rejectFile(file('photo.heic', 1024, 'image/heic'))).toBeNull()
    })

    it('rejects an unsupported format', () => {
      expect(rejectFile(file('archive.zip', 1024, 'application/zip'))).toContain('format accepté')
    })

    it('rejects a file over the max size', () => {
      const result = rejectFile(file('big.png', MAX_FILE_BYTES + 1, 'image/png'))
      expect(result).toContain('trop lourd')
    })

    it('rejects an empty file', () => {
      expect(rejectFile(file('empty.png', 0, 'image/png'))).toContain('vide')
    })
  })

  describe('readableSize', () => {
    it('formats bytes', () => {
      expect(readableSize(500)).toBe('500 o')
    })

    it('formats kilobytes', () => {
      expect(readableSize(2048)).toBe('2 Ko')
    })

    it('formats megabytes', () => {
      expect(readableSize(5 * 1024 * 1024)).toBe('5.0 Mo')
    })
  })

  describe('sanitizeFileName', () => {
    it('strips accents and spaces', () => {
      expect(sanitizeFileName("Capture d'écran 2026-08-31 à 10.10.12.png")).toBe('capture-d-ecran-2026-08-31-a-10-10-12.png')
    })

    it('keeps a reasonable extension', () => {
      expect(sanitizeFileName('photo.HEIC')).toBe('photo.heic')
    })
  })
})
