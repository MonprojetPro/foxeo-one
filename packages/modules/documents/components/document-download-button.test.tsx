import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentDownloadButton } from './document-download-button'
import type { Document } from '../types/document.types'

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, toast: mockToast }
})

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

  it('affiche "Télécharger" pour un PDF', () => {
    render(<DocumentDownloadButton document={baseDoc} contentUrl="https://example.com/file.pdf" />)
    expect(screen.getByTestId('download-button')).toHaveTextContent('Télécharger')
  })

  it('affiche "Télécharger" (pas "HTML") pour un Markdown', () => {
    const mdDoc = { ...baseDoc, fileType: 'md', name: 'guide.md' }
    render(<DocumentDownloadButton document={mdDoc} contentUrl={null} />)
    const btn = screen.getByTestId('download-button')
    expect(btn).toHaveTextContent('Télécharger')
    expect(btn).not.toHaveTextContent('HTML')
  })

  it('déclenche le téléchargement du fichier réel via le proxy API', () => {
    const mdDoc = { ...baseDoc, fileType: 'md', name: 'guide.md' }
    render(<DocumentDownloadButton document={mdDoc} contentUrl={null} />)

    // Mock createElement APRÈS le render (sinon React casse au rendu des éléments hôtes).
    const anchor = window.document.createElement('a')
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {})
    const createSpy = vi.spyOn(window.document, 'createElement').mockReturnValue(anchor)

    fireEvent.click(screen.getByTestId('download-button'))

    expect(anchor.href).toContain('/api/documents/download/doc-1')
    expect(clickSpy).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith('Téléchargement lancé')

    createSpy.mockRestore()
  })

  it('rend la variante icône', () => {
    render(
      <DocumentDownloadButton document={baseDoc} contentUrl="https://example.com/file.pdf" variant="icon" />
    )
    expect(screen.getByTestId('download-button-icon')).toBeTruthy()
  })
})
