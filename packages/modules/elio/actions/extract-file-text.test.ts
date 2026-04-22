import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractFileText } from './extract-file-text'

vi.mock('mammoth', () => ({
  extractRawText: vi.fn(),
}))

function makeFile(name: string, type: string, content: string, sizeMb = 0): File {
  const blob = new Blob([content], { type })
  const file = new File([blob], name, { type })
  if (sizeMb > 0) {
    // Override size for large-file tests
    Object.defineProperty(file, 'size', { value: sizeMb * 1024 * 1024, configurable: true })
  }
  return file
}

describe('extractFileText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extrait le texte d\'un fichier TXT', async () => {
    const file = makeFile('note.txt', 'text/plain', 'Bonjour depuis le fichier texte')
    const { result, error } = await extractFileText(file)
    expect(error).toBeNull()
    expect(result?.text).toBe('Bonjour depuis le fichier texte')
  })

  it('retourne une erreur si le fichier TXT est vide', async () => {
    const file = makeFile('vide.txt', 'text/plain', '   ')
    const { result, error } = await extractFileText(file)
    expect(result).toBeNull()
    expect(error).toContain('vide')
  })

  it('extrait le texte d\'un fichier DOCX via mammoth', async () => {
    const { extractRawText } = await import('mammoth')
    vi.mocked(extractRawText).mockResolvedValue({ value: 'Contenu du document Word', messages: [] })

    const file = makeFile(
      'document.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'dummy'
    )
    const { result, error } = await extractFileText(file)
    expect(error).toBeNull()
    expect(result?.text).toBe('Contenu du document Word')
  })

  it('retourne une erreur si le DOCX est vide', async () => {
    const { extractRawText } = await import('mammoth')
    vi.mocked(extractRawText).mockResolvedValue({ value: '   ', messages: [] })

    const file = makeFile(
      'vide.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'dummy'
    )
    const { result, error } = await extractFileText(file)
    expect(result).toBeNull()
    expect(error).toContain('vide')
  })

  it('retourne un placeholder pour les PDF', async () => {
    const file = makeFile('rapport.pdf', 'application/pdf', '%PDF-1.4 dummy content')
    const { result, error } = await extractFileText(file)
    expect(error).toBeNull()
    expect(result?.text).toContain('rapport.pdf')
    expect(result?.text).toContain('[Document PDF')
  })

  it('retourne une erreur si le format n\'est pas supporté', async () => {
    const file = makeFile('image.png', 'image/png', 'binary data')
    const { result, error } = await extractFileText(file)
    expect(result).toBeNull()
    expect(error).toContain('non supporté')
  })

  it('retourne une erreur si le fichier dépasse 10 Mo', async () => {
    const file = makeFile('gros.txt', 'text/plain', 'x', 11)
    const { result, error } = await extractFileText(file)
    expect(result).toBeNull()
    expect(error).toContain('10 Mo')
  })

  it('retourne une erreur si mammoth lève une exception', async () => {
    const { extractRawText } = await import('mammoth')
    vi.mocked(extractRawText).mockRejectedValue(new Error('Fichier corrompu'))

    const file = makeFile(
      'corrompu.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'bad data'
    )
    const { result, error } = await extractFileText(file)
    expect(result).toBeNull()
    expect(error).toBe('Fichier corrompu')
  })
})
