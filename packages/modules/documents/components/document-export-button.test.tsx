import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DocumentExportButton } from './document-export-button'
import type { Document } from '../types/document.types'

const { mockToast, mockDownload, mockCreatePdf } = vi.hoisted(() => {
  const mockDownload = vi.fn()
  return {
    mockToast: { success: vi.fn(), error: vi.fn() },
    mockDownload,
    mockCreatePdf: vi.fn(() => ({ download: mockDownload })),
  }
})

// pdfmake est un bundle navigateur de ~2 Mo : on le simule plutôt que de le charger.
vi.mock('pdfmake/build/pdfmake', () => ({ default: { createPdf: mockCreatePdf, vfs: {} } }))
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: {} }))

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

  // 2026-08-02 — l'export PDF utilise le générateur partagé (pdfmake), le même que
  // les documents du parcours : un seul moteur, une seule mise en page, un seul
  // endroit à corriger. Plus de pop-up (bloquée par défaut) ni de dialogue système.
  describe('PDF', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        text: async () => '# Brief\n\n| A | B |\n|---|---|\n| 1 | 2 |',
      })))
    })

    it('repart du markdown source et télécharge le fichier', async () => {
      render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
      fireEvent.click(screen.getByTestId('export-menu-trigger'))
      fireEvent.click(screen.getByTestId('export-pdf'))

      await waitFor(() => expect(mockDownload).toHaveBeenCalledWith('brief.pdf'))
      expect(fetch).toHaveBeenCalledWith('/api/documents/download/doc-1')
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    it('applique les garde-fous de pagination du générateur partagé', async () => {
      render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
      fireEvent.click(screen.getByTestId('export-menu-trigger'))
      fireEvent.click(screen.getByTestId('export-pdf'))

      await waitFor(() => expect(mockCreatePdf).toHaveBeenCalled())
      const def = JSON.stringify(mockCreatePdf.mock.calls[0]?.[0])
      expect(def).toContain('headerRows')     // en-tête de tableau répété
      expect(def).toContain('dontBreakRows')  // ligne jamais coupée
    })

    it('prévient l\'utilisateur si le document est introuvable', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, text: async () => '' })))

      render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
      fireEvent.click(screen.getByTestId('export-menu-trigger'))
      fireEvent.click(screen.getByTestId('export-pdf'))

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('404')))
      expect(mockDownload).not.toHaveBeenCalled()
    })
  })
})
