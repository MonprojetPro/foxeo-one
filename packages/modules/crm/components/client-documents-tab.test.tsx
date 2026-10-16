import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientDocumentsTab } from './client-documents-tab'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/modules/crm/clients/123',
}))

vi.mock('@monprojetpro/module-documents', () => ({
  getDocuments: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'doc-1',
        clientId: 'client-1',
        operatorId: 'op-1',
        name: 'Brief initial',
        filePath: 'op-1/client-1/brief.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        folderId: null,
        tags: ['brief'],
        visibility: 'private',
        uploadedBy: 'operator',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        lastSyncedAt: null,
        deletedAt: null,
      },
      {
        id: 'doc-2',
        clientId: 'client-1',
        operatorId: 'op-1',
        name: 'Livrable final',
        filePath: 'op-1/client-1/livrable.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        folderId: null,
        tags: [],
        visibility: 'shared',
        uploadedBy: 'operator',
        createdAt: '2024-01-16T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
        lastSyncedAt: null,
        deletedAt: null,
      },
    ],
    error: null,
  }),
  getOperatorId: vi.fn().mockResolvedValue({ data: 'op-1', error: null }),
  useShareDocument: vi.fn().mockReturnValue({
    share: vi.fn(),
    unshare: vi.fn(),
    isSharing: false,
    isUnsharing: false,
  }),
  DocumentsPageClient: vi.fn(() => null),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('ClientDocumentsTab', () => {
  it('affiche le bouton Gestion des documents', () => {
    renderWithQueryClient(<ClientDocumentsTab clientId="client-1" />)

    expect(screen.getByText('Gestion des documents')).toBeInTheDocument()
  })

  it('affiche la liste des documents', async () => {
    renderWithQueryClient(<ClientDocumentsTab clientId="client-1" />)

    expect(await screen.findByText('Brief initial')).toBeInTheDocument()
    expect(await screen.findByText('Livrable final')).toBeInTheDocument()
  })

  it('affiche le badge Privé pour un document privé', async () => {
    renderWithQueryClient(<ClientDocumentsTab clientId="client-1" />)

    expect(await screen.findByText('Privé')).toBeInTheDocument()
  })

  it('affiche le badge Partagé pour un document partagé', async () => {
    renderWithQueryClient(<ClientDocumentsTab clientId="client-1" />)

    expect(await screen.findByText('Partagé')).toBeInTheDocument()
  })

  it('affiche l\'état vide quand aucun document', async () => {
    const { getDocuments } = await import('@monprojetpro/module-documents')
    vi.mocked(getDocuments).mockResolvedValueOnce({ data: [], error: null })

    renderWithQueryClient(<ClientDocumentsTab clientId="client-1" />)

    expect(await screen.findByText(/aucun document/i)).toBeInTheDocument()
  })

  /**
   * ⚠️ TEST DE VERROUILLAGE — incident du 16-10, tracé dans activity_logs.
   * Le badge de partage était la SEULE chose cliquable de la ligne. MiKL,
   * cherchant à consulter une transcription de visio, a cliqué dessus et l'a
   * envoyée au client sans le vouloir. Un document qu'on ne peut pas ouvrir
   * pousse à cliquer sur autre chose.
   */
  it('le nom du document ouvre le fichier, sans le telecharger', async () => {
    renderWithQueryClient(<ClientDocumentsTab clientId="client-1" />)

    const lien = (await screen.findByText('Brief initial')).closest('a')
    expect(lien).not.toBeNull()
    expect(lien?.getAttribute('href')).toContain('inline=1')
    expect(lien?.getAttribute('target')).toBe('_blank')
  })

  it('le badge de partage annonce ce qu’un clic va FAIRE, pas l’etat courant', async () => {
    renderWithQueryClient(<ClientDocumentsTab clientId="client-1" />)

    const badge = (await screen.findByText('Privé')).closest('button')
    expect(badge?.getAttribute('title')).toMatch(/partager ce document avec le client/i)
  })
})
