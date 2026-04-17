import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AccountantNotifications } from './accountant-notifications'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(),
    useQueryClient: vi.fn(() => ({
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    })),
  }
})

vi.mock('../actions/resolve-accountant-notification', () => ({
  getAccountantNotifications: vi.fn(async () => ({ data: [], error: null })),
  resolveAccountantNotification: vi.fn(async () => ({ data: { resolved: true }, error: null })),
}))

vi.mock('./accountant-config-panel', () => ({
  AccountantConfigPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="config-panel">
      <button onClick={onClose}>Fermer config</button>
    </div>
  ),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})

const mockUseQuery = vi.mocked(useQuery)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AccountantNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQueryClient).mockReturnValue({ setQueryData: vi.fn(), invalidateQueries: vi.fn() } as ReturnType<typeof useQueryClient>)
  })

  it("affiche l'état vide quand aucune notification", () => {
    mockUseQuery.mockReturnValue({ data: [], isPending: false } as ReturnType<typeof useQuery>)
    render(<AccountantNotifications />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText(/Aucune demande en attente/)).toBeInTheDocument()
  })

  it('affiche la liste des notifications actives', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 'notif-1',
          type: 'missing_receipt',
          title: 'Justificatif facture 2024-01',
          body: 'Merci de fournir le justificatif',
          source_email: 'comptable@cabinet.fr',
          status: 'unread',
          created_at: '2026-04-17T09:00:00Z',
        },
      ],
      isPending: false,
    } as ReturnType<typeof useQuery>)
    render(<AccountantNotifications />)
    expect(screen.getByTestId('notification-item')).toBeInTheDocument()
    expect(screen.getByText('Justificatif facture 2024-01')).toBeInTheDocument()
  })

  it('affiche le badge count non lus', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 'n1', type: 'other', title: 'Msg 1', body: null, source_email: null, status: 'unread', created_at: '2026-04-17T09:00:00Z' },
        { id: 'n2', type: 'other', title: 'Msg 2', body: null, source_email: null, status: 'read', created_at: '2026-04-16T09:00:00Z' },
      ],
      isPending: false,
    } as ReturnType<typeof useQuery>)
    render(<AccountantNotifications />)
    expect(screen.getByTestId('unread-badge')).toBeInTheDocument()
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('1')
  })

  it('ouvre le panel de configuration au clic sur Configurer', () => {
    mockUseQuery.mockReturnValue({ data: [], isPending: false } as ReturnType<typeof useQuery>)
    render(<AccountantNotifications />)
    fireEvent.click(screen.getByTestId('configure-btn'))
    expect(screen.getByTestId('config-panel')).toBeInTheDocument()
  })

  it('affiche le skeleton pendant le chargement', () => {
    mockUseQuery.mockReturnValue({ data: [], isPending: true } as ReturnType<typeof useQuery>)
    render(<AccountantNotifications />)
    expect(screen.getByTestId('notifications-skeleton')).toBeInTheDocument()
  })
})
