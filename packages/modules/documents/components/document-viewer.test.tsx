import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentViewer } from './document-viewer'
import type { Document } from '../types/document.types'

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/utils')>()
  return {
    ...actual,
    formatFileSize: vi.fn((bytes: number) => `${(bytes / 1024).toFixed(0)} Ko`),
  }
})

const baseDocument: Document = {
  id: 'doc-1',
  clientId: 'client-1',
  operatorId: 'op-1',
  name: 'test-file',
  filePath: 'op-1/client-1/test-file',
  fileType: 'md',
  fileSize: 2048,
  folderId: null,
  tags: [],
  visibility: 'private',
  uploadedBy: 'operator',
  createdAt: '2026-02-18T10:00:00.000Z',
  updatedAt: '2026-02-18T10:00:00.000Z',
}

const onDownload = vi.fn()

describe('DocumentViewer', () => {
  it('shows skeleton when isPending is true', () => {
    render(
      <DocumentViewer
        document={null}
        contentUrl={null}
        markdownHtml={null}
        isPending={true}
        onDownload={onDownload}
      />
    )

    expect(screen.getByTestId('document-viewer-skeleton')).toBeTruthy()
  })

  it('renders Markdown as HTML', () => {
    const doc = { ...baseDocument, fileType: 'md' }
    render(
      <DocumentViewer
        document={doc}
        contentUrl={null}
        markdownHtml="<h1>Titre</h1><p>Contenu</p>"
        isPending={false}
        onDownload={onDownload}
      />
    )

    const viewer = screen.getByTestId('document-viewer-markdown')
    expect(viewer).toBeTruthy()
    expect(viewer.innerHTML).toContain('Titre')
    expect(viewer.innerHTML).toContain('Contenu')
  })

  it('renders PDF in iframe', () => {
    const doc = { ...baseDocument, fileType: 'pdf', name: 'rapport.pdf' }
    render(
      <DocumentViewer
        document={doc}
        contentUrl="https://storage.example.com/signed/rapport.pdf"
        markdownHtml={null}
        isPending={false}
        onDownload={onDownload}
      />
    )

    expect(screen.getByTestId('document-viewer-pdf')).toBeTruthy()
    const iframe = screen.getByTestId('pdf-iframe') as HTMLIFrameElement
    expect(iframe.src).toContain('signed/rapport.pdf')
    expect(iframe.title).toBe('rapport.pdf')
  })

  it('renders images directly', () => {
    const doc = { ...baseDocument, fileType: 'png', name: 'photo.png' }
    render(
      <DocumentViewer
        document={doc}
        contentUrl="https://storage.example.com/signed/photo.png"
        markdownHtml={null}
        isPending={false}
        onDownload={onDownload}
      />
    )

    expect(screen.getByTestId('document-viewer-image')).toBeTruthy()
    const img = screen.getByTestId('image-element') as HTMLImageElement
    expect(img.src).toContain('signed/photo.png')
    expect(img.alt).toBe('photo.png')
  })

  it('renders fallback metadata preview for unsupported types', () => {
    const doc = { ...baseDocument, fileType: 'docx', name: 'doc.docx' }
    render(
      <DocumentViewer
        document={doc}
        contentUrl="https://storage.example.com/signed/doc.docx"
        markdownHtml={null}
        isPending={false}
        onDownload={onDownload}
      />
    )

    expect(screen.getByTestId('document-metadata-preview')).toBeTruthy()
    expect(screen.getByTestId('metadata-name')).toHaveTextContent('doc.docx')
  })

  it('renders fallback metadata preview for CSV files', () => {
    const doc = { ...baseDocument, fileType: 'csv', name: 'data.csv' }
    render(
      <DocumentViewer
        document={doc}
        contentUrl="https://storage.example.com/signed/data.csv"
        markdownHtml={null}
        isPending={false}
        onDownload={onDownload}
      />
    )

    expect(screen.getByTestId('document-metadata-preview')).toBeTruthy()
  })

  it('shows skeleton when document is null', () => {
    render(
      <DocumentViewer
        document={null}
        contentUrl={null}
        markdownHtml={null}
        isPending={false}
        onDownload={onDownload}
      />
    )

    expect(screen.getByTestId('document-viewer-skeleton')).toBeTruthy()
  })
})
