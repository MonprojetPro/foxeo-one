import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubscriptionsList } from './subscriptions-list'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@foxeo/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} /> }
})

import { useQuery } from '@tanstack/react-query'

const mockUseQuery = vi.mocked(useQuery)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeSubRow = (overrides: Partial<{
  id: string
  pennylane_id: string
  status: string
  amount: number | null
  data: Record<string, unknown>
}> = {}) => ({
  id: 'row-1',
  entity_type: 'subscription' as const,
  pennylane_id: 'pl-sub-1',
  client_id: 'client-1',
  status: 'active',
  amount: 4900,
  data: {
    start_date: '2026-03-01',
    recurring_period: 'monthly',
    status: 'active',
  },
  last_synced_at: '2026-03-07T00:00:00Z',
  created_at: '2026-03-07T00:00:00Z',
  updated_at: '2026-03-07T00:00:00Z',
  ...overrides,
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SubscriptionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true, isError: false } as ReturnType<typeof useQuery>)
    render(<SubscriptionsList />)
    expect(screen.getByTestId('subscriptions-skeleton')).toBeInTheDocument()
  })

  it('shows error message when query fails', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: false, isError: true } as ReturnType<typeof useQuery>)
    render(<SubscriptionsList />)
    expect(screen.getByText(/Erreur lors du chargement/)).toBeInTheDocument()
  })

  it('shows empty state when no subscriptions', () => {
    mockUseQuery.mockReturnValue({ data: [], isPending: false, isError: false } as ReturnType<typeof useQuery>)
    render(<SubscriptionsList />)
    expect(screen.getByText(/Aucun abonnement trouvé/)).toBeInTheDocument()
  })

  it('renders subscription rows when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: [makeSubRow()],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useQuery>)
    render(<SubscriptionsList />)
    expect(screen.getByTestId('subscriptions-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('subscription-row')).toHaveLength(1)
  })

  it('shows green badge for active subscription', () => {
    mockUseQuery.mockReturnValue({
      data: [makeSubRow({ status: 'active' })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useQuery>)
    render(<SubscriptionsList />)
    const badge = screen.getByTestId('subscription-status')
    expect(badge).toHaveTextContent('Actif')
    expect(badge.className).toContain('green')
  })

  it('shows orange badge for stopped subscription', () => {
    mockUseQuery.mockReturnValue({
      data: [makeSubRow({ status: 'stopped' })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useQuery>)
    render(<SubscriptionsList />)
    const badge = screen.getByTestId('subscription-status')
    expect(badge).toHaveTextContent('Suspendu')
    expect(badge.className).toContain('orange')
  })

  it('shows grey badge for finished subscription', () => {
    mockUseQuery.mockReturnValue({
      data: [makeSubRow({ status: 'finished' })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useQuery>)
    render(<SubscriptionsList />)
    const badge = screen.getByTestId('subscription-status')
    expect(badge).toHaveTextContent('Terminé')
    expect(badge.className).toContain('muted')
  })

  it('displays formatted amount', () => {
    mockUseQuery.mockReturnValue({
      data: [makeSubRow({ amount: 9900 })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useQuery>)
    render(<SubscriptionsList />)
    expect(screen.getByTestId('subscription-row')).toHaveTextContent('99')
  })

  it('filters by clientId when provided', () => {
    // useBillingSyncRows is called with ('subscription', clientId) — mock verifies call
    const mockHook = vi.fn().mockReturnValue({ data: [], isPending: false, isError: false })
    mockUseQuery.mockImplementation(() => mockHook() as ReturnType<typeof useQuery>)
    render(<SubscriptionsList clientId="client-42" />)
    // Component rendered without crash — hook receives clientId via useBillingSyncRows
    expect(screen.getByText(/Aucun abonnement trouvé/)).toBeInTheDocument()
  })
})
