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

  // 2026-08-02 — l'export PDF passe par une iframe cachée (brique partagée
  // `printHtmlDocument`) et non plus par `window.open` : la pop-up était bloquée
  // par défaut et l'export échouait. Il n'y a donc plus de cas « pop-ups bloqués ».
  it('PDF : imprime via une iframe cachée, sans pop-up', () => {
    const openSpy = vi.spyOn(window, 'open')
    const printSpy = vi.fn()
    // jsdom n'implémente pas l'impression : on intercepte le print de l'iframe.
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({
      focus: vi.fn(),
      print: printSpy,
      addEventListener: vi.fn(),
    } as unknown as Window)

    render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    fireEvent.click(screen.getByTestId('export-pdf'))

    const iframe = window.document.querySelector('iframe')
    expect(iframe).toBeTruthy()
    expect(openSpy).not.toHaveBeenCalled()
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('PDF : le document imprimé porte les règles de saut de page', () => {
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({
      focus: vi.fn(), print: vi.fn(), addEventListener: vi.fn(),
    } as unknown as Window)

    render(<DocumentExportButton document={mdDoc} markdownHtml="<h1>Brief</h1>" />)
    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    fireEvent.click(screen.getByTestId('export-pdf'))

    const srcdoc = window.document.querySelector('iframe')?.getAttribute('srcdoc') ?? ''
    // Les garde-fous qui empêchent de couper un tableau ou un encart en deux.
    expect(srcdoc).toContain('break-inside: avoid')
    expect(srcdoc).toContain('display: table-header-group')
    expect(srcdoc).toContain('<h1>Brief</h1>')
  })
})
