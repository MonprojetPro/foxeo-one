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

vi.mock('../utils/local-folder', () => ({
  isLocalFolderSupported: vi.fn(() => false),
  pickAndStoreFolder: vi.fn(),
  getStoredFolderHandle: vi.fn(async () => null),
  hasFolderPermission: vi.fn(async () => false),
  requestFolderPermission: vi.fn(async () => false),
  writeFileToFolder: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})

import { getClientProjects } from '../actions/get-client-projects'
import { createClientProject } from '../actions/create-client-project'
import { getClientDocuments } from '../actions/get-client-documents'
import { isLocalFolderSupported } from '../utils/local-folder'

const mockGetProjects = vi.mocked(getClientProjects)
const mockCreateProject = vi.mocked(createClientProject)
const mockGetDocuments = vi.mocked(getClientDocuments)
const mockSupported = vi.mocked(isLocalFolderSupported)

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

describe('ClientProjectFolderTab', () => {
  it("affiche un etat vide quand le client n'a aucun projet", async () => {
    mockGetProjects.mockResolvedValue({ data: [], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(true)

    render(<ClientProjectFolderTab clientId={CLIENT_ID} />)

    await waitFor(() => {
      expect(screen.getByText(/aucun projet pour ce client/i)).toBeInTheDocument()
    })
  })

  it('liste les projets existants', async () => {
    mockGetProjects.mockResolvedValue({ data: [project({})], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(true)

    render(<ClientProjectFolderTab clientId={CLIENT_ID} />)

    await waitFor(() => {
      expect(screen.getByText('Refonte site vitrine')).toBeInTheDocument()
    })
  })

  it('avertit quand le navigateur ne supporte pas la liaison de dossier', async () => {
    mockGetProjects.mockResolvedValue({ data: [], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(false)

    render(<ClientProjectFolderTab clientId={CLIENT_ID} />)

    await waitFor(() => {
      expect(screen.getByText(/navigateur non supporté/i)).toBeInTheDocument()
    })
  })

  it('cree un nouveau projet depuis le champ nom', async () => {
    mockGetProjects.mockResolvedValue({ data: [], error: null })
    mockGetDocuments.mockResolvedValue({ data: [], error: null })
    mockSupported.mockReturnValue(true)
    mockCreateProject.mockResolvedValue({ data: project({ name: 'Nouveau projet' }), error: null })

    render(<ClientProjectFolderTab clientId={CLIENT_ID} />)

    const input = await screen.findByTestId('project-name-input')
    await userEvent.type(input, 'Nouveau projet')
    await userEvent.click(screen.getByTestId('project-create'))

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({ clientId: CLIENT_ID, name: 'Nouveau projet' })
    })
  })
})
