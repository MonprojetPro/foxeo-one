import { describe, it, expect, vi } from 'vitest'
import { render as rtlRender, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { ClientProjectFolderTab } from './client-project-folder-tab'
import type { ClientProject } from '../types/crm.types'

// ============================================================
// T-063 — l'onglet "Projet" remplace "Cursor" (chemin Mac en dur, jamais
// fonctionnel sous Windows — voir le board). Le point à verrouiller : le Hub
// n'écrit jamais sur le disque sans un dossier explicitement lié, et le dit
// clairement quand le navigateur ne supporte pas l'API.
// ============================================================

vi.mock('../actions/get-client-projects', () => ({ getClientProjects: vi.fn() }))
vi.mock('../actions/create-client-project', () => ({ createClientProject: vi.fn() }))
vi.mock('../actions/delete-client-project', () => ({ deleteClientProject: vi.fn() }))
vi.mock('../actions/get-client-documents', () => ({ getClientDocuments: vi.fn() }))
vi.mock('../actions/assign-document-project', () => ({ assignDocumentProject: vi.fn() }))

vi.mock('../utils/local-folder', () => ({
  isLocalFolderSupported: vi.fn(() => false),
  pickAndStoreFolder: vi.fn(),
  getStoredFolderHandle: vi.fn(async () => null),
  hasFolderPermission: vi.fn(async () => false),
  requestFolderPermission: vi.fn(async () => false),
  writeFileToFolder: vi.fn(),
  listFolderLevel: vi.fn(async () => []),
  pickAndStoreRootFolder: vi.fn(),
  getStoredRootFolder: vi.fn(async () => null),
  ensureClientFolder: vi.fn(),
  inferLocalCategoryFromTags: vi.fn(() => 'autres'),
  getArchivedDocumentIds: vi.fn(async () => new Set()),
  markDocumentsArchived: vi.fn(),
}))

vi.mock('@monprojetpro/module-documents', () => ({
  getDocumentUrl: vi.fn(async () => ({ data: { url: 'https://example.com/file.pdf' }, error: null })),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})

import { getClientProjects } from '../actions/get-client-projects'
import { createClientProject } from '../actions/create-client-project'
import { getClientDocuments } from '../actions/get-client-documents'
import {
  isLocalFolderSupported,
  getStoredFolderHandle,
  hasFolderPermission,
  listFolderLevel,
} from '../utils/local-folder'

const mockGetProjects = vi.mocked(getClientProjects)
const mockCreateProject = vi.mocked(createClientProject)
const mockGetDocuments = vi.mocked(getClientDocuments)
const mockSupported = vi.mocked(isLocalFolderSupported)
const mockGetStoredFolderHandle = vi.mocked(getStoredFolderHandle)
const mockHasFolderPermission = vi.mocked(hasFolderPermission)
const mockListFolderLevel = vi.mocked(listFolderLevel)

const CLIENT_ID = '444f3b89-5303-459f-a128-dfb0df99abf7'

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

function project(partial: Partial<ClientProject>): ClientProject {
  return {
    id: 'project-1',
    clientId: CLIENT_ID,
    name: 'Refonte site vitrine',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
    ...partial,
  }
}

function doc(partial: { id: string; name: string; clientProjectId?: string | null }) {
  return { url: 'https://example.com/file.pdf', ...partial }
}

describe('ClientProjectFolderTab', () => {
  it("affiche un etat vide quand le client n'a aucun projet", async () => {
    mockGetProjects.mockResolvedValue({ data: [], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(true)

    render(<ClientProjectFolderTab clientId={CLIENT_ID} clientName="Client Test" />)

    await waitFor(() => {
      expect(screen.getByText(/aucun projet pour ce client/i)).toBeInTheDocument()
    })
  })

  it('liste les projets existants', async () => {
    mockGetProjects.mockResolvedValue({ data: [project({})], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(true)

    render(<ClientProjectFolderTab clientId={CLIENT_ID} clientName="Client Test" />)

    await waitFor(() => {
      expect(screen.getByText('Refonte site vitrine')).toBeInTheDocument()
    })
  })

  it('avertit quand le navigateur ne supporte pas la liaison de dossier', async () => {
    mockGetProjects.mockResolvedValue({ data: [], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(false)

    render(<ClientProjectFolderTab clientId={CLIENT_ID} clientName="Client Test" />)

    await waitFor(() => {
      expect(screen.getByText(/navigateur non supporté/i)).toBeInTheDocument()
    })
  })

  it('cree un nouveau projet depuis le champ nom', async () => {
    mockGetProjects.mockResolvedValue({ data: [], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(true)
    mockCreateProject.mockResolvedValue({ data: project({ name: 'Nouveau projet' }), error: null })

    render(<ClientProjectFolderTab clientId={CLIENT_ID} clientName="Client Test" />)

    const input = await screen.findByTestId('project-name-input')
    await userEvent.type(input, 'Nouveau projet')
    await userEvent.click(screen.getByTestId('project-create'))

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({ clientId: CLIENT_ID, name: 'Nouveau projet' })
    })
  })

  it('range un document uniquement sous le projet auquel il est assigne', async () => {
    mockGetProjects.mockResolvedValue({
      data: [project({ id: 'project-1', name: 'Site vitrine' }), project({ id: 'project-2', name: 'App mobile' })],
      error: null,
    })
    mockGetDocuments.mockResolvedValue({
      data: [
        doc({ id: 'doc-1', name: 'devis-site.pdf', clientProjectId: 'project-1' }),
        doc({ id: 'doc-2', name: 'devis-app.pdf', clientProjectId: 'project-2' }),
      ],
      error: null,
    })
    mockSupported.mockReturnValue(true)

    render(<ClientProjectFolderTab clientId={CLIENT_ID} clientName="Client Test" />)

    await waitFor(() => {
      expect(screen.getAllByTestId('project-card')).toHaveLength(2)
    })

    const cards = screen.getAllByTestId('project-card')
    const siteCard = cards.find((c) => c.textContent?.includes('Site vitrine'))
    const appCard = cards.find((c) => c.textContent?.includes('App mobile'))

    expect(siteCard?.textContent).toContain('devis-site.pdf')
    expect(siteCard?.textContent).not.toContain('devis-app.pdf')
    expect(appCard?.textContent).toContain('devis-app.pdf')
    expect(appCard?.textContent).not.toContain('devis-site.pdf')

    // Aucun document non assigne a afficher dans ce cas
    expect(screen.queryByTestId('unassigned-document')).not.toBeInTheDocument()
  })

  it('propose les documents non ranges dans un pool dedie, Ranger desactive sans selection', async () => {
    mockGetProjects.mockResolvedValue({ data: [project({})], error: null })
    mockGetDocuments.mockResolvedValue({
      data: [doc({ id: 'doc-1', name: 'transcription-reunion.pdf', clientProjectId: null })],
      error: null,
    })
    mockSupported.mockReturnValue(true)

    render(<ClientProjectFolderTab clientId={CLIENT_ID} clientName="Client Test" />)

    const unassigned = await screen.findByTestId('unassigned-document')
    expect(unassigned.textContent).toContain('transcription-reunion.pdf')
    expect(screen.getByTestId('assign-document')).toBeDisabled()
  })

  it('affiche le contenu reel du dossier lie, y compris ce que MiKL y range a la main', async () => {
    mockGetProjects.mockResolvedValue({ data: [project({ id: 'project-1' })], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(true)
    mockGetStoredFolderHandle.mockResolvedValue({} as never)
    mockHasFolderPermission.mockResolvedValue(true)
    const subFolderHandle = { kind: 'directory' as const }
    mockListFolderLevel.mockResolvedValueOnce([
      { name: 'sous dossier de test', kind: 'directory', handle: subFolderHandle as never },
      { name: 'devis.pdf', kind: 'file', handle: {} as never },
    ])

    render(<ClientProjectFolderTab clientId={CLIENT_ID} clientName="Client Test" />)

    const contents = await screen.findByTestId('folder-contents')
    await waitFor(() => {
      expect(contents.textContent).toContain('sous dossier de test')
      expect(contents.textContent).toContain('devis.pdf')
    })
  })

  it('deplie un sous-dossier au clic et lit son contenu a la demande (pas avant)', async () => {
    mockGetProjects.mockResolvedValue({ data: [project({ id: 'project-1' })], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(true)
    mockGetStoredFolderHandle.mockResolvedValue({} as never)
    mockHasFolderPermission.mockResolvedValue(true)
    const subFolderHandle = { kind: 'directory' as const }
    mockListFolderLevel.mockClear()
    mockListFolderLevel.mockImplementation(async (handle: unknown) => {
      if (handle === subFolderHandle) {
        return [{ name: 'reformulation.md', kind: 'file', handle: {} as never }]
      }
      return [{ name: 'Dossier CII', kind: 'directory', handle: subFolderHandle as never }]
    })

    render(<ClientProjectFolderTab clientId={CLIENT_ID} clientName="Client Test" />)

    const folderRow = await screen.findByText('Dossier CII')
    // Pas encore descendu dans le sous-dossier : un seul appel (le niveau racine)
    expect(mockListFolderLevel).toHaveBeenCalledTimes(1)

    await userEvent.click(folderRow)

    await waitFor(() => {
      expect(screen.getByText('reformulation.md')).toBeInTheDocument()
    })
    expect(mockListFolderLevel).toHaveBeenCalledTimes(2)
  })
})
