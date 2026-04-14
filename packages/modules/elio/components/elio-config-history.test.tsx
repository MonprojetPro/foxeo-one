import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ElioConfigHistory } from './elio-config-history'

const mockGetHistory = vi.fn()
const mockRestoreConfig = vi.fn()
const mockInvalidateQueries = vi.fn()

vi.mock('../actions/get-elio-config-history', () => ({
  getElioConfigHistory: (...args: unknown[]) => mockGetHistory(...args),
}))

vi.mock('../actions/restore-elio-config', () => ({
  restoreElioConfig: (...args: unknown[]) => mockRestoreConfig(...args),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  }
})

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
  }
})

const HISTORY_ENTRY = {
  id: 'hist-1',
  clientId: 'client-1',
  fieldChanged: 'elio_config',
  oldValue: { model: 'claude-haiku-4-20250122', temperature: 0.5, max_tokens: 1000 },
  newValue: { model: 'claude-sonnet-4-20250514', temperature: 1.0, max_tokens: 1500 },
  changedAt: '2026-03-01T10:00:00Z',
  changedBy: 'user-1',
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('ElioConfigHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRestoreConfig.mockResolvedValue({ data: {}, error: null })
  })

  it('affiche le message vide si aucun historique', async () => {
    mockGetHistory.mockResolvedValue({ data: [], error: null })
    render(<ElioConfigHistory clientId="client-1" />, { wrapper })
    await waitFor(() => {
      expect(screen.getByTestId('elio-config-history-empty')).toBeDefined()
    })
  })

  it('affiche les entrées d\'historique', async () => {
    mockGetHistory.mockResolvedValue({ data: [HISTORY_ENTRY], error: null })
    render(<ElioConfigHistory clientId="client-1" />, { wrapper })
    await waitFor(() => {
      expect(screen.getByTestId('elio-config-history')).toBeDefined()
    })
  })

  it('affiche le bouton Restaurer pour chaque entrée', async () => {
    mockGetHistory.mockResolvedValue({ data: [HISTORY_ENTRY], error: null })
    render(<ElioConfigHistory clientId="client-1" />, { wrapper })
    await waitFor(() => {
      expect(screen.getByTestId(`restore-btn-${HISTORY_ENTRY.id}`)).toBeDefined()
    })
  })

  it('ouvre la modale de confirmation au clic sur Restaurer', async () => {
    mockGetHistory.mockResolvedValue({ data: [HISTORY_ENTRY], error: null })
    render(<ElioConfigHistory clientId="client-1" />, { wrapper })
    await waitFor(() => {
      expect(screen.getByTestId(`restore-btn-${HISTORY_ENTRY.id}`)).toBeDefined()
    })
    fireEvent.click(screen.getByTestId(`restore-btn-${HISTORY_ENTRY.id}`))
    expect(screen.getByTestId('restore-confirm-modal')).toBeDefined()
  })

  it('appelle restoreElioConfig après confirmation', async () => {
    mockGetHistory.mockResolvedValue({ data: [HISTORY_ENTRY], error: null })
    render(<ElioConfigHistory clientId="client-1" />, { wrapper })
    await waitFor(() => {
      expect(screen.getByTestId(`restore-btn-${HISTORY_ENTRY.id}`)).toBeDefined()
    })
    fireEvent.click(screen.getByTestId(`restore-btn-${HISTORY_ENTRY.id}`))
    fireEvent.click(screen.getByTestId('confirm-restore-btn'))
    await waitFor(() => {
      expect(mockRestoreConfig).toHaveBeenCalledWith('client-1', HISTORY_ENTRY.id)
    })
  })

  it('développe l\'entrée au clic pour voir les détails', async () => {
    mockGetHistory.mockResolvedValue({ data: [HISTORY_ENTRY], error: null })
    render(<ElioConfigHistory clientId="client-1" />, { wrapper })
    await waitFor(() => {
      expect(screen.getByTestId(`history-entry-${HISTORY_ENTRY.id}`)).toBeDefined()
    })
    fireEvent.click(screen.getByTestId(`expand-btn-${HISTORY_ENTRY.id}`))
    // Après expansion, les valeurs diff doivent être visibles
    expect(screen.getByText('model')).toBeDefined()
  })

  it('invalide les caches après restauration réussie', async () => {
    mockGetHistory.mockResolvedValue({ data: [HISTORY_ENTRY], error: null })
    render(<ElioConfigHistory clientId="client-1" />, { wrapper })
    await waitFor(() => {
      expect(screen.getByTestId(`restore-btn-${HISTORY_ENTRY.id}`)).toBeDefined()
    })
    fireEvent.click(screen.getByTestId(`restore-btn-${HISTORY_ENTRY.id}`))
    fireEvent.click(screen.getByTestId('confirm-restore-btn'))
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
    })
  })
})
