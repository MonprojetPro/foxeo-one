import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubscriptionCard } from './subscription-card'
import type { BillingSyncRow } from '../types/billing.types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/use-billing', () => ({
  useBillingSyncRows: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    Skeleton: ({ className }: { className?: string }) => (
      <div data-testid="subscription-card-skeleton" className={className} />
    ),
  }
})

const { useBillingSyncRows } = await import('../hooks/use-billing')
const mockUseBillingSyncRows = vi.mocked(useBillingSyncRows)

const makeSubscription = (overrides: Partial<BillingSyncRow> = {}): BillingSyncRow => ({
  id: 'sub-1',
  entity_type: 'subscription',
  pennylane_id: 'pen-sub-1',
  client_id: 'client-1',
  status: 'active',
  amount: 19900, // 199€ en centimes
  data: {
    recurring_period: 'monthly',
    start_date: '2026-01-01',
    next_billing_date: '2026-05-01',
  },
  last_synced_at: '2026-04-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SubscriptionCard', () => {
  it('affiche le skeleton pendant le chargement', () => {
    mockUseBillingSyncRows.mockReturnValue({ data: [], isPending: true, isError: false } as ReturnType<typeof useBillingSyncRows>)
    render(<SubscriptionCard clientId="client-1" />)
    expect(screen.getByTestId('subscription-card-skeleton')).toBeDefined()
  })

  it('affiche la card avec plan, montant et date', () => {
    mockUseBillingSyncRows.mockReturnValue({
      data: [makeSubscription()],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useBillingSyncRows>)
    render(<SubscriptionCard clientId="client-1" />)
    expect(screen.getByTestId('subscription-card')).toBeDefined()
    expect(screen.getByTestId('subscription-period').textContent).toBe('Mensuel')
    expect(screen.getByTestId('subscription-monthly-amount').textContent).toContain('199')
    expect(screen.getByTestId('subscription-next-date').textContent).toContain('2026')
  })

  it('affiche le badge statut Actif (vert)', () => {
    mockUseBillingSyncRows.mockReturnValue({
      data: [makeSubscription({ status: 'active' })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useBillingSyncRows>)
    render(<SubscriptionCard clientId="client-1" />)
    const badge = screen.getByTestId('subscription-status-badge')
    expect(badge.textContent).toBe('Actif')
    expect(badge.className).toContain('green')
  })

  it('affiche le badge statut Suspendu (orange)', () => {
    mockUseBillingSyncRows.mockReturnValue({
      data: [makeSubscription({ status: 'stopped' })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useBillingSyncRows>)
    render(<SubscriptionCard clientId="client-1" />)
    const badge = screen.getByTestId('subscription-status-badge')
    expect(badge.textContent).toBe('Suspendu')
    expect(badge.className).toContain('orange')
  })

  it('ne rend rien si aucun abonnement', () => {
    mockUseBillingSyncRows.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useBillingSyncRows>)
    const { container } = render(<SubscriptionCard clientId="client-1" />)
    expect(container.firstChild).toBeNull()
  })

  it('ne rend rien en cas d\'erreur de chargement', () => {
    mockUseBillingSyncRows.mockReturnValue({
      data: [],
      isPending: false,
      isError: true,
    } as ReturnType<typeof useBillingSyncRows>)
    const { container } = render(<SubscriptionCard clientId="client-1" />)
    expect(container.firstChild).toBeNull()
  })

  it('affiche "Mon abonnement" pour un abonnement résilié', () => {
    mockUseBillingSyncRows.mockReturnValue({
      data: [makeSubscription({ status: 'finished' })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useBillingSyncRows>)
    render(<SubscriptionCard clientId="client-1" />)
    expect(screen.getByText('Mon abonnement')).toBeDefined()
  })
})
