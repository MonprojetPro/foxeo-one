import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/use-billing', () => ({
  useBillingMetrics: vi.fn(),
  useBillingSyncRows: vi.fn(),
}))

vi.mock('../actions/get-clients', () => ({
  getClientsWithPennylane: vi.fn().mockResolvedValue({ data: [], error: null }),
}))

vi.mock('./quote-form', () => ({
  QuoteForm: () => <div data-testid="quote-form" />,
}))

vi.mock('./quotes-list', () => ({
  QuotesList: () => <div data-testid="quotes-list" />,
}))

vi.mock('./invoices-list', () => ({
  InvoicesList: () => <div data-testid="invoices-list" />,
}))

vi.mock('./subscriptions-list', () => ({
  SubscriptionsList: () => <div data-testid="subscriptions-list" />,
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

import { useBillingMetrics } from '../hooks/use-billing'
import { BillingDashboard } from './billing-dashboard'
import type { Mock } from 'vitest'

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function mockMetrics(metrics: { monthlyRevenue: number; pendingAmount: number; pendingQuotesCount: number; mrr: number }) {
  ;(useBillingMetrics as Mock).mockReturnValue({ data: metrics, isPending: false, isError: false })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BillingDashboard — métriques Hub (AC #4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le bloc métriques', () => {
    mockMetrics({ monthlyRevenue: 0, pendingAmount: 0, pendingQuotesCount: 0, mrr: 0 })
    render(<BillingDashboard />, { wrapper })
    expect(screen.getByTestId('billing-metrics')).toBeInTheDocument()
  })

  it('affiche le CA mensuel formaté', () => {
    mockMetrics({ monthlyRevenue: 500000, pendingAmount: 0, pendingQuotesCount: 0, mrr: 0 })
    render(<BillingDashboard />, { wrapper })
    // 500000 / 100 = 5000€
    expect(screen.getByTestId('metric-monthly-revenue')).toHaveTextContent('5')
  })

  it('affiche le montant en attente formaté', () => {
    mockMetrics({ monthlyRevenue: 0, pendingAmount: 120000, pendingQuotesCount: 0, mrr: 0 })
    render(<BillingDashboard />, { wrapper })
    // 120000 / 100 = 1200€
    expect(screen.getByTestId('metric-pending-amount')).toHaveTextContent('1')
  })

  it('affiche le nombre de devis en cours', () => {
    mockMetrics({ monthlyRevenue: 0, pendingAmount: 0, pendingQuotesCount: 7, mrr: 0 })
    render(<BillingDashboard />, { wrapper })
    expect(screen.getByTestId('metric-pending-quotes')).toHaveTextContent('7')
  })

  it('affiche le MRR formaté', () => {
    mockMetrics({ monthlyRevenue: 0, pendingAmount: 0, pendingQuotesCount: 0, mrr: 99900 })
    render(<BillingDashboard />, { wrapper })
    // 99900 / 100 = 999€
    expect(screen.getByTestId('metric-mrr')).toHaveTextContent('999')
  })

  it('affiche "…" pendant le chargement', () => {
    ;(useBillingMetrics as Mock).mockReturnValue({ data: undefined, isPending: true, isError: false })
    render(<BillingDashboard />, { wrapper })
    const loadingTexts = screen.getAllByText('…')
    expect(loadingTexts.length).toBeGreaterThan(0)
  })
})
