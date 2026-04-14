import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DocumentDownloadButton } from './document-download-button'
import type { Document } from '../types/document.types'

const { mockToast, mockGeneratePdf } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockGeneratePdf: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, toast: mockToast }
})

vi.mock('../actions/generate-pdf', () => ({
  generatePdf: (...args: unknown[]) => mockGeneratePdf(...args),
}))

const baseDoc: Document = {
  id: 'doc-1',
  clientId: 'client-1',
  operatorId: 'op-1',
  name: 'rapport.pdf',
  filePath: 'op-1/client-1/rapport.pdf',
  fileType: 'pdf',
  fileSize: 2048,
  folderId: null,
  tags: [],
  visibility: 'private',
  uploadedBy: 'operator',
  createdAt: '2026-02-18T10:00:00.000Z',
  updatedAt: '2026-02-18T10:00:00.000Z',
}

describe('DocumentDownloadButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Telecharger" for PDF files', () => {
    render(<DocumentDownloadButton document={baseDoc} contentUrl="https://example.com/file.pdf" />)
    expect(screen.getByTestId('download-button')).toHaveTextContent('Télécharger')
  })

  it('shows "Telecharger en HTML" for Markdown files', () => {
    const mdDoc = { ...baseDoc, fileType: 'md', name: 'guide.md' }
    render(<DocumentDownloadButton document={mdDoc} contentUrl={null} />)
    expect(screen.getByTestId('download-button')).toHaveTextContent('Télécharger en HTML')
  })

  it('calls generatePdf for Markdown', async () => {
    const mdDoc = { ...baseDoc, fileType: 'md', name: 'guide.md' }
    mockGeneratePdf.mockResolvedValue({
      data: { htmlContent: '<html>content</html>', fileName: 'guide.pdf' },
      error: null,
    })

    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test')
    globalThis.URL.revokeObjectURL = vi.fn()

    render(<DocumentDownloadButton document={mdDoc} contentUrl={null} />)
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(mockGeneratePdf).toHaveBeenCalledWith({ documentId: 'doc-1' })
    })
  })

  it('shows error toast when generatePdf fails', async () => {
    const mdDoc = { ...baseDoc, fileType: 'md', name: 'guide.md' }
    mockGeneratePdf.mockResolvedValue({
      data: null,
      error: { message: 'Erreur generation', code: 'INTERNAL_ERROR' },
    })

    render(<DocumentDownloadButton document={mdDoc} contentUrl={null} />)
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Erreur generation')
    })
  })

  it('renders icon variant', () => {
    render(
      <DocumentDownloadButton document={baseDoc} contentUrl="https://example.com/file.pdf" variant="icon" />
    )
    expect(screen.getByTestId('download-button-icon')).toBeTruthy()
  })
})
