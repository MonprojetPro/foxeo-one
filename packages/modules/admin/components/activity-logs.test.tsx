import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ActivityLogs } from './activity-logs'
import * as useActivityLogsModule from '../hooks/use-activity-logs'

vi.mock('../hooks/use-activity-logs')

const mockLogs = [
  {
    id: 'log-1',
    actorType: 'operator',
    actorId: 'op-uuid-001',
    action: 'client_suspended',
    entityType: 'client',
    entityId: 'client-001',
    metadata: { reason: 'non-payment' },
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'log-2',
    actorType: 'client',
    actorId: 'user-uuid-002',
    action: 'brief_submitted',
    entityType: 'brief',
    entityId: 'brief-001',
    metadata: null,
    createdAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'log-3',
    actorType: 'system',
    actorId: 'system-000',
    action: 'maintenance_toggled',
    entityType: null,
    entityId: null,
    metadata: { enabled: true },
    createdAt: '2026-03-01T08:00:00Z',
  },
]

describe('ActivityLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeletons when pending', () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error state', () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    expect(screen.getByText(/Erreur lors du chargement des logs/i)).toBeTruthy()
  })

  it('renders empty state when no logs', () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: { logs: [], total: 0 },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    expect(screen.getByText(/Aucun log trouvé/i)).toBeTruthy()
  })

  it('renders list of logs', () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: { logs: mockLogs, total: 3 },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    // Use getAllByText since action names appear in both dropdown options and log badges
    expect(screen.getAllByText('client_suspended').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('brief_submitted').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('maintenance_toggled').length).toBeGreaterThanOrEqual(1)
  })

  it('renders filter controls', () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: { logs: [], total: 0 },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    expect(screen.getByLabelText(/Filtrer par client/i)).toBeTruthy()
    expect(screen.getByLabelText(/Filtrer par type d'action/i)).toBeTruthy()
    expect(screen.getByLabelText(/Filtrer par acteur/i)).toBeTruthy()
    expect(screen.getByLabelText(/Recherche textuelle/i)).toBeTruthy()
  })

  it('shows pagination when total > 50', () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: { logs: mockLogs, total: 120 },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    expect(screen.getByLabelText(/Page suivante/i)).toBeTruthy()
    expect(screen.getByLabelText(/Page précédente/i)).toBeTruthy()
  })

  it('previous button disabled on first page', () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: { logs: mockLogs, total: 120 },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    const prevBtn = screen.getByLabelText(/Page précédente/i) as HTMLButtonElement
    expect(prevBtn.disabled).toBe(true)
  })

  it('expandable metadata shows/hides details', async () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: { logs: [mockLogs[0]], total: 1 },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    const expandBtn = screen.getByText('Voir détails')
    fireEvent.click(expandBtn)
    await waitFor(() => {
      expect(screen.getByText('Masquer détails')).toBeTruthy()
    })
    // JSON should be shown
    expect(screen.getByText(/non-payment/)).toBeTruthy()
  })

  it('does not show pagination when total <= 50', () => {
    vi.mocked(useActivityLogsModule.useActivityLogs).mockReturnValue({
      data: { logs: mockLogs, total: 3 },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useActivityLogsModule.useActivityLogs>)

    render(<ActivityLogs />)
    expect(screen.queryByLabelText(/Page suivante/i)).toBeNull()
  })
})
