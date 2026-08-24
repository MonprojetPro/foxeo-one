import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

vi.mock('./subscription-form', () => ({
  SubscriptionForm: () => <div data-testid="subscription-form" />,
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

  // Le chargement affiche desormais des squelettes de cartes, et non plus des
  // points de suspension a la place de chaque valeur.
  it('affiche des squelettes pendant le chargement', () => {
    ;(useBillingMetrics as Mock).mockReturnValue({ data: undefined, isPending: true, isError: false })
    const { container } = render(<BillingDashboard />, { wrapper })
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('billing-metrics')).toBeNull()
  })
})

describe('BillingDashboard — onglet Abonnements (grille v2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMetrics({ monthlyRevenue: 0, pendingAmount: 0, pendingQuotesCount: 0, mrr: 0 })
  })

  function openSubscriptionsTab() {
    render(<BillingDashboard />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: 'Abonnements' }))
  }

  it('affiche le bouton "+ Nouvel abonnement" et la liste', () => {
    openSubscriptionsTab()
    expect(screen.getByTestId('toggle-subscription-form')).toHaveTextContent('+ Nouvel abonnement')
    expect(screen.getByTestId('subscriptions-list')).toBeInTheDocument()
    // Le form n'est pas monté par défaut
    expect(screen.queryByTestId('subscription-form')).not.toBeInTheDocument()
  })

  it('affiche le SubscriptionForm au clic sur "+ Nouvel abonnement"', () => {
    openSubscriptionsTab()
    fireEvent.click(screen.getByTestId('toggle-subscription-form'))
    expect(screen.getByTestId('subscription-form')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-subscription-form')).toHaveTextContent('Annuler')
  })

  it('masque le form au second clic (Annuler)', () => {
    openSubscriptionsTab()
    fireEvent.click(screen.getByTestId('toggle-subscription-form'))
    fireEvent.click(screen.getByTestId('toggle-subscription-form'))
    expect(screen.queryByTestId('subscription-form')).not.toBeInTheDocument()
  })
})
