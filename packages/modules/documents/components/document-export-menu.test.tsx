import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Document } from '../types/document.types'

const { mockExportCSV, mockExportJSON, mockGeneratePdf, mockGetDocumentUrl, mockToast } =
  vi.hoisted(() => ({
    mockExportCSV: vi.fn(),
    mockExportJSON: vi.fn(),
    mockGeneratePdf: vi.fn(),
    mockGetDocumentUrl: vi.fn(),
    mockToast: { success: vi.fn(), error: vi.fn() },
  }))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, toast: mockToast }
})

vi.mock('../hooks/use-export-documents', () => ({
  useExportDocuments: vi.fn(() => ({
    exportCSV: mockExportCSV,
    exportJSON: mockExportJSON,
    isPending: false,
  })),
}))

vi.mock('../actions/generate-pdf', () => ({
  generatePdf: (...args: unknown[]) => mockGeneratePdf(...args),
}))

vi.mock('../actions/get-document-url', () => ({
  getDocumentUrl: (...args: unknown[]) => mockGetDocumentUrl(...args),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

const pdfDoc: Document = {
  id: 'doc-pdf',
  clientId: CLIENT_ID,
  operatorId: 'op-1',
  name: 'rapport.pdf',
  filePath: 'op/client/rapport.pdf',
  fileType: 'pdf',
  fileSize: 2048,
  folderId: null,
  tags: [],
  visibility: 'shared',
  uploadedBy: 'operator',
  createdAt: '2026-02-19T10:00:00.000Z',
  updatedAt: '2026-02-19T10:00:00.000Z',
  lastSyncedAt: null,
  deletedAt: null,
}

const mdDoc: Document = { ...pdfDoc, id: 'doc-md', name: 'guide.md', fileType: 'md' }

describe('DocumentExportMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('sans document sélectionné — le menu ne contient pas l\'item PDF après ouverture', async () => {
    const { DocumentExportMenu } = await import('./document-export-menu')
    render(<DocumentExportMenu clientId={CLIENT_ID} />)

    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    await waitFor(() => screen.getByTestId('export-menu-content'))

    expect(screen.queryByTestId('export-pdf-item')).toBeNull()
    expect(screen.getByTestId('export-csv-item')).toBeTruthy()
    expect(screen.getByTestId('export-json-item')).toBeTruthy()
  })

  it('avec document sélectionné — l\'item PDF est présent après ouverture', async () => {
    const { DocumentExportMenu } = await import('./document-export-menu')
    render(<DocumentExportMenu clientId={CLIENT_ID} selectedDocument={pdfDoc} />)

    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    await waitFor(() => screen.getByTestId('export-menu-content'))

    expect(screen.getByTestId('export-pdf-item')).toBeTruthy()
  })

  it('clic sur CSV — appelle exportCSV', async () => {
    const { DocumentExportMenu } = await import('./document-export-menu')
    render(<DocumentExportMenu clientId={CLIENT_ID} />)

    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    await waitFor(() => screen.getByTestId('export-csv-item'))
    fireEvent.click(screen.getByTestId('export-csv-item'))

    expect(mockExportCSV).toHaveBeenCalledTimes(1)
  })

  it('clic sur JSON — appelle exportJSON', async () => {
    const { DocumentExportMenu } = await import('./document-export-menu')
    render(<DocumentExportMenu clientId={CLIENT_ID} />)

    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    await waitFor(() => screen.getByTestId('export-json-item'))
    fireEvent.click(screen.getByTestId('export-json-item'))

    expect(mockExportJSON).toHaveBeenCalledTimes(1)
  })

  it('clic sur PDF pour un fichier Markdown — appelle generatePdf', async () => {
    mockGeneratePdf.mockResolvedValue({
      data: { htmlContent: '<html>content</html>', fileName: 'guide.pdf' },
      error: null,
    })

    const { DocumentExportMenu } = await import('./document-export-menu')
    render(<DocumentExportMenu clientId={CLIENT_ID} selectedDocument={mdDoc} />)

    fireEvent.click(screen.getByTestId('export-menu-trigger'))
    await waitFor(() => screen.getByTestId('export-pdf-item'))
    fireEvent.click(screen.getByTestId('export-pdf-item'))

    await waitFor(() => {
      expect(mockGeneratePdf).toHaveBeenCalledWith({ documentId: 'doc-md' })
    })
  })

  it('état loading — bouton désactivé quand isPending=true', async () => {
    const { useExportDocuments } = await import('../hooks/use-export-documents')
    vi.mocked(useExportDocuments).mockReturnValue({
      exportCSV: mockExportCSV,
      exportJSON: mockExportJSON,
      isPending: true,
    })

    const { DocumentExportMenu } = await import('./document-export-menu')
    render(<DocumentExportMenu clientId={CLIENT_ID} />)

    const trigger = screen.getByTestId('export-menu-trigger')
    expect(trigger).toBeDisabled()
  })
})
