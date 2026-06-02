import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentExportButton } from './document-export-button'
import type { Document } from '../types/document.types'

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, toast: mockToast }
})

const mdDoc: Document = {
  id: 'doc-1',
  clientId: 'c-1',
  operatorId: 'op-1',
  name: 'Brief.md',
  filePath: 'op-1/c-1/Brief.md',
  fileType: 'md',
  fileSize: 100,
  folderId: null,
  tags: [],
  visibility: 'shared',
  uploadedBy: 'operator',
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
}
const pdfDoc: Document = { ...mdDoc, name: 'rapport.pdf', fileType: 'pdf' }

describe('DocumentExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  it('document non-markdown : bouton simple « Télécharger »', () => {
    render(<DocumentExportButton document={pdfDoc} markdownHtml={null} />)
    expect(screen.getByTestId('export-download')).toBeTruthy()
    expect(screen.queryByTestId('export-menu-trigger')).toBeNull()
  })

  it('document markdown : ouvre un menu .md / Word / PDF', () => {
    render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    expect(screen.getByTestId('export-md')).toBeTruthy()
    expect(screen.getByTestId('export-word')).toBeTruthy()
    expect(screen.getByTestId('export-pdf')).toBeTruthy()
  })

  it('Word : télécharge un fichier .doc de type application/msword', () => {
    const createSpy = vi.mocked(URL.createObjectURL)
    render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    fireEvent.click(screen.getByTestId('export-word'))

    expect(createSpy).toHaveBeenCalled()
    const blobArg = createSpy.mock.calls[0]?.[0] as Blob
    expect(blobArg.type).toBe('application/msword')
    expect(mockToast.success).toHaveBeenCalledWith('Document Word téléchargé')
  })

  it('PDF : ouvre une fenêtre via une URL Blob (impression navigateur)', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window)
    render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    fireEvent.click(screen.getByTestId('export-pdf'))

    expect(openSpy).toHaveBeenCalledWith('blob:test', '_blank', 'noopener,noreferrer')
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('PDF : erreur si les pop-ups sont bloqués', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    fireEvent.click(screen.getByTestId('export-pdf'))

    expect(mockToast.error).toHaveBeenCalledWith('Autorise les pop-ups pour générer le PDF')
  })
})
