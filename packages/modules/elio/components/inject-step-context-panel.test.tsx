import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InjectStepContextPanel } from './inject-step-context-panel'

vi.mock('../actions/inject-step-context', () => ({
  injectStepContext: vi.fn(),
}))
vi.mock('../actions/get-step-contexts', () => ({
  getStepContexts: vi.fn(),
}))
vi.mock('../actions/delete-step-context', () => ({
  deleteStepContext: vi.fn(),
}))
vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div data-testid="sheet">{children}</div> : null,
    SheetContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="sheet-content">{children}</div>
    ),
    SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  }
})

import { getStepContexts } from '../actions/get-step-contexts'
import { injectStepContext } from '../actions/inject-step-context'
import { deleteStepContext } from '../actions/delete-step-context'

const PARCOURS_AGENT_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const baseProps = {
  parcoursAgentId: PARCOURS_AGENT_ID,
  clientId: CLIENT_ID,
  stepLabel: 'Identité de marque',
  open: true,
  onClose: vi.fn(),
}

describe('InjectStepContextPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getStepContexts).mockResolvedValue({ data: [], error: null })
    // jsdom n'implémente pas window.confirm — on le mock pour autoriser les suppressions dans les tests
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('affiche le titre et le label de l\'étape', async () => {
    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    await waitFor(() => {
      expect(screen.getByText('Nourrir Élio')).toBeTruthy()
      expect(screen.getByText('Identité de marque')).toBeTruthy()
    })
  })

  it('affiche les deux onglets texte / fichier', async () => {
    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    await waitFor(() => {
      expect(screen.getByText('Ajouter un prompt')).toBeTruthy()
      expect(screen.getByText('Uploader un fichier')).toBeTruthy()
    })
  })

  it('affiche la zone de texte par défaut (onglet texte actif)', async () => {
    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /contexte/i })).toBeTruthy()
    })
  })

  it('bascule vers l\'onglet fichier au clic', async () => {
    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    await waitFor(() => screen.getByText('Uploader un fichier'))
    await userEvent.click(screen.getByText('Uploader un fichier'))
    expect(screen.getByLabelText(/zone d'upload/i)).toBeTruthy()
  })

  it('affiche un message vide si aucun contexte historique', async () => {
    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    await waitFor(() =>
      expect(screen.getByText(/Aucun contexte injecté/i)).toBeTruthy()
    )
  })

  it('affiche les contextes existants avec leur statut', async () => {
    vi.mocked(getStepContexts).mockResolvedValue({
      data: [
        {
          id: 'ctx-1',
          contentType: 'text',
          contextMessage: 'Précisions importantes sur le branding',
          fileName: null,
          filePath: null,
          consumedAt: null,
          createdAt: '2026-04-22T10:00:00Z',
        },
      ],
      error: null,
    })

    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    // findByText a un timeout plus long et utilise waitFor en interne
    const ctxText = await screen.findByText(/Précisions importantes/i, undefined, { timeout: 3000 })
    expect(ctxText).toBeTruthy()
    expect(screen.getAllByText(/En attente/i).length).toBeGreaterThan(0)
    expect(vi.mocked(getStepContexts)).toHaveBeenCalledWith(PARCOURS_AGENT_ID)
  })

  it('affiche le badge "En attente" pour les contextes non-consommés', async () => {
    vi.mocked(getStepContexts).mockResolvedValue({
      data: [
        {
          id: 'ctx-2',
          contentType: 'text',
          contextMessage: 'Context A',
          fileName: null,
          filePath: null,
          consumedAt: null,
          createdAt: '2026-04-22T10:00:00Z',
        },
      ],
      error: null,
    })

    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    await waitFor(() => {
      expect(screen.getByLabelText(/1 contexte.*en attente/i)).toBeTruthy()
    })
  })

  it('appelle injectStepContext au submit du formulaire texte', async () => {
    vi.mocked(injectStepContext).mockResolvedValue({ data: { id: 'new-ctx' }, error: null })

    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    await waitFor(() => screen.getByRole('textbox', { name: /contexte/i }))

    await userEvent.type(screen.getByRole('textbox', { name: /contexte/i }), 'Ma question pour Élio')
    await userEvent.click(screen.getByRole('button', { name: /injecter/i }))

    await waitFor(() => expect(injectStepContext).toHaveBeenCalledOnce())
  })

  it('appelle deleteStepContext au clic sur supprimer', async () => {
    vi.mocked(getStepContexts).mockResolvedValue({
      data: [
        {
          id: 'ctx-del',
          contentType: 'text',
          contextMessage: 'À supprimer',
          fileName: null,
          filePath: null,
          consumedAt: null,
          createdAt: '2026-04-22T10:00:00Z',
        },
      ],
      error: null,
    })
    vi.mocked(deleteStepContext).mockResolvedValue({ data: { deleted: true }, error: null })

    render(<InjectStepContextPanel {...baseProps} />, { wrapper })
    await waitFor(() => screen.getByText(/À supprimer/i))

    const deleteBtn = screen.getByRole('button', { name: /Supprimer le contexte/i })
    await userEvent.click(deleteBtn)

    await waitFor(() => expect(deleteStepContext).toHaveBeenCalledWith('ctx-del'))
  })
})
