import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { Document } from '../types/document.types'

const mockShare = vi.fn()
const mockUnshare = vi.fn()

vi.mock('../hooks/use-share-document', () => ({
  useShareDocument: vi.fn(() => ({
    share: mockShare,
    unshare: mockUnshare,
    isSharing: false,
    isUnsharing: false,
  })),
}))

vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} data-testid="alert-cancel">{children}</button>
  ),
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} data-testid="alert-confirm">{children}</button>
  ),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const PRIVATE_DOC: Document = {
  id: 'doc-1',
  clientId: 'client-1',
  operatorId: 'op-1',
  name: 'rapport.pdf',
  filePath: 'op/client/rapport.pdf',
  fileType: 'pdf',
  fileSize: 1024,
  folderId: null,
  tags: [],
  visibility: 'private',
  uploadedBy: 'operator',
  createdAt: '2026-02-19T10:00:00Z',
  updatedAt: '2026-02-19T10:00:00Z',
  lastSyncedAt: null,
  deletedAt: null,
}

const SHARED_DOC: Document = { ...PRIVATE_DOC, visibility: 'shared' }

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('DocumentShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Partager" button for private document', async () => {
    const { DocumentShareButton } = await import('./document-share-button')
    render(<DocumentShareButton document={PRIVATE_DOC} clientId="client-1" />, { wrapper: Wrapper })
    expect(screen.getByText('Partager')).toBeDefined()
  })

  it('renders "Retirer le partage" button for shared document', async () => {
    const { DocumentShareButton } = await import('./document-share-button')
    render(<DocumentShareButton document={SHARED_DOC} clientId="client-1" />, { wrapper: Wrapper })
    expect(screen.getByText('Retirer le partage')).toBeDefined()
  })

  it('calls share when clicking "Partager"', async () => {
    const { DocumentShareButton } = await import('./document-share-button')
    render(<DocumentShareButton document={PRIVATE_DOC} clientId="client-1" />, { wrapper: Wrapper })
    fireEvent.click(screen.getByText('Partager'))
    expect(mockShare).toHaveBeenCalledWith('doc-1')
  })

  it('shows AlertDialog when clicking "Retirer le partage"', async () => {
    const { DocumentShareButton } = await import('./document-share-button')
    render(<DocumentShareButton document={SHARED_DOC} clientId="client-1" />, { wrapper: Wrapper })
    // Dialog content should be present (AlertDialog is always rendered in mock)
    expect(screen.getByText('Retirer le partage ?')).toBeDefined()
  })

  it('calls unshare on confirmation', async () => {
    const { DocumentShareButton } = await import('./document-share-button')
    render(<DocumentShareButton document={SHARED_DOC} clientId="client-1" />, { wrapper: Wrapper })
    fireEvent.click(screen.getByTestId('alert-confirm'))
    expect(mockUnshare).toHaveBeenCalledWith('doc-1')
  })

  it('does not call unshare on cancel', async () => {
    const { DocumentShareButton } = await import('./document-share-button')
    render(<DocumentShareButton document={SHARED_DOC} clientId="client-1" />, { wrapper: Wrapper })
    fireEvent.click(screen.getByTestId('alert-cancel'))
    expect(mockUnshare).not.toHaveBeenCalled()
  })
})
