import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Document } from '../types/document.types'

// Mock @monprojetpro/ui Dialog primitives
vi.mock('@monprojetpro/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

// Mock DocumentViewer + DocumentIcon (rendus internes hors périmètre)
vi.mock('./document-viewer', () => ({
  DocumentViewer: ({ document }: { document: Document | null }) => (
    <div data-testid="viewer">{document?.name ?? 'pending'}</div>
  ),
}))
vi.mock('./document-icon', () => ({
  DocumentIcon: () => <span data-testid="doc-icon" />,
}))

// Mock markdownToHtml (pas de conversion réelle nécessaire ici)
vi.mock('../utils/markdown-to-html', () => ({ markdownToHtml: (s: string) => s }))

const MOCK_DOC: Document = {
  id: 'doc-1',
  clientId: 'client-1',
  operatorId: 'op-1',
  name: 'brief.md',
  filePath: 'op/client/brief.md',
  fileType: 'md',
  fileSize: 2048,
  folderId: null,
  tags: [],
  visibility: 'shared',
  uploadedBy: 'operator',
  createdAt: '2026-06-01T10:00:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
  lastSyncedAt: null,
  deletedAt: null,
}

const mockViewer = vi.fn()
vi.mock('../hooks/use-document-viewer', () => ({
  useDocumentViewer: (id: string) => mockViewer(id),
}))

describe('DocumentPreviewModal', () => {
  it('ne rend rien quand documentId est null (modale fermée)', async () => {
    mockViewer.mockReturnValue({
      document: null, contentUrl: null, markdownContent: null, isPending: false, error: null,
    })
    const { DocumentPreviewModal } = await import('./document-preview-modal')
    render(<DocumentPreviewModal documentId={null} onClose={() => {}} />)
    expect(screen.queryByTestId('dialog')).toBeNull()
  })

  it('affiche le viewer avec le nom du document quand ouvert', async () => {
    mockViewer.mockReturnValue({
      document: MOCK_DOC, contentUrl: null, markdownContent: '# Titre', isPending: false, error: null,
    })
    const { DocumentPreviewModal } = await import('./document-preview-modal')
    render(<DocumentPreviewModal documentId="doc-1" onClose={() => {}} />)
    expect(screen.getByTestId('dialog')).toBeDefined()
    expect(screen.getByTestId('viewer').textContent).toBe('brief.md')
  })

  it('affiche un message d\'erreur si le document est introuvable', async () => {
    mockViewer.mockReturnValue({
      document: null, contentUrl: null, markdownContent: null, isPending: false,
      error: new Error('Document introuvable'),
    })
    const { DocumentPreviewModal } = await import('./document-preview-modal')
    render(<DocumentPreviewModal documentId="doc-x" onClose={() => {}} />)
    expect(screen.getByText('Document introuvable')).toBeDefined()
  })
})
