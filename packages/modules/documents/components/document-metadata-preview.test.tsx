import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentMetadataPreview } from './document-metadata-preview'
import type { Document } from '../types/document.types'

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/utils')>()
  return {
    ...actual,
    formatFileSize: vi.fn((bytes: number) => `${(bytes / 1024).toFixed(0)} Ko`),
  }
})

const mockDocument: Document = {
  id: 'doc-1',
  clientId: 'client-1',
  operatorId: 'op-1',
  name: 'rapport.docx',
  filePath: 'op-1/client-1/rapport.docx',
  fileType: 'docx',
  fileSize: 51200,
  folderId: null,
  tags: [],
  visibility: 'private',
  uploadedBy: 'operator',
  createdAt: '2026-02-18T10:00:00.000Z',
  updatedAt: '2026-02-18T10:00:00.000Z',
}

describe('DocumentMetadataPreview', () => {
  it('displays document name, type, and size', () => {
    render(
      <DocumentMetadataPreview document={mockDocument} onDownload={vi.fn()} />
    )

    expect(screen.getByTestId('metadata-name')).toHaveTextContent('rapport.docx')
    expect(screen.getByTestId('metadata-type')).toHaveTextContent('DOCX')
    expect(screen.getByTestId('metadata-size')).toHaveTextContent('50 Ko')
  })

  it('displays download button that calls onDownload', () => {
    const onDownload = vi.fn()
    render(
      <DocumentMetadataPreview document={mockDocument} onDownload={onDownload} />
    )

    const button = screen.getByTestId('metadata-download-button')
    expect(button).toHaveTextContent('Télécharger')
    fireEvent.click(button)
    expect(onDownload).toHaveBeenCalledOnce()
  })

  it('shows loading state when downloading', () => {
    render(
      <DocumentMetadataPreview
        document={mockDocument}
        onDownload={vi.fn()}
        isDownloading
      />
    )

    const button = screen.getByTestId('metadata-download-button')
    expect(button).toHaveTextContent('Téléchargement...')
    expect(button).toBeDisabled()
  })

  it('displays formatted date', () => {
    render(
      <DocumentMetadataPreview document={mockDocument} onDownload={vi.fn()} />
    )

    expect(screen.getByTestId('metadata-date')).toBeTruthy()
  })
})
