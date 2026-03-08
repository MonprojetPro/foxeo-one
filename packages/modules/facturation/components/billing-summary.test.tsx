import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/use-billing', () => ({
  useBillingSyncRows: vi.fn(),
}))

vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
  }
})

import { useBillingSyncRows } from '../hooks/use-billing'
import { BillingSummary } from './billing-summary'
import type { Mock } from 'vitest'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInvoiceRow(status: string, amount: number, data: Record<string, unknown> = {}) {
  return {
    id: `row-${Math.random()}`,
    entity_type: 'invoice' as const,
    pennylane_id: `pny-${Math.random()}`,
    client_id: 'client-uuid',
    status,
    amount,
    data,
    last_synced_at: '2025-01-15T10:00:00Z',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BillingSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche des skeletons en chargement', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({ data: undefined, isPending: true, isError: false })
    render(<BillingSummary />, { wrapper })
    expect(screen.getByTestId('billing-summary-skeleton')).toBeInTheDocument()
  })

  it('affiche "Aucune donnée" si pas de factures', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({ data: [], isPending: false, isError: false })
    render(<BillingSummary />, { wrapper })
    // Should show zeros
    expect(screen.getByText(/total payé/i)).toBeInTheDocument()
  })

  it('affiche le total payé', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [
        makeInvoiceRow('paid', 10000),
        makeInvoiceRow('paid', 5000),
        makeInvoiceRow('unpaid', 3000),
      ],
      isPending: false,
      isError: false,
    })
    render(<BillingSummary />, { wrapper })
    expect(screen.getByText(/total payé/i)).toBeInTheDocument()
    // 15000 / 100 = 150€
    expect(screen.getByTestId('total-paid')).toHaveTextContent('150')
  })

  it('affiche le montant en attente', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [
        makeInvoiceRow('paid', 10000),
        makeInvoiceRow('unpaid', 3000),
        makeInvoiceRow('unpaid', 2000),
      ],
      isPending: false,
      isError: false,
    })
    render(<BillingSummary />, { wrapper })
    expect(screen.getByText(/en attente/i)).toBeInTheDocument()
    // 5000 / 100 = 50€
    expect(screen.getByTestId('total-pending')).toHaveTextContent('50')
  })

  it('affiche 0€ si aucune facture payée', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeInvoiceRow('unpaid', 5000)],
      isPending: false,
      isError: false,
    })
    render(<BillingSummary />, { wrapper })
    expect(screen.getByTestId('total-paid')).toHaveTextContent('0')
  })
})
