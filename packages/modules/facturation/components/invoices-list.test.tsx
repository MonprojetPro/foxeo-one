import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

vi.mock('../actions/trigger-client-billing-sync', () => ({
  triggerClientBillingSync: vi.fn().mockResolvedValue({ data: { synced: 1 }, error: null }),
}))

import { useBillingSyncRows } from '../hooks/use-billing'
import { InvoicesList } from './invoices-list'
import type { Mock } from 'vitest'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<{
  id: string
  pennylane_id: string
  client_id: string
  status: string
  amount: number | null
  data: Record<string, unknown>
}> = {}) {
  return {
    id: overrides.id ?? 'row-1',
    entity_type: 'invoice' as const,
    pennylane_id: overrides.pennylane_id ?? 'pny-inv-1',
    client_id: overrides.client_id ?? 'client-uuid',
    status: overrides.status ?? 'paid',
    amount: overrides.amount ?? 10000,
    data: overrides.data ?? {
      invoice_number: 'FA-2025-001',
      date: '2025-01-15',
      file_url: 'https://pennylane.com/invoice.pdf',
    },
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

describe('InvoicesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche des skeletons en chargement', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() })
    render(<InvoicesList />, { wrapper })
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('affiche un message vide si aucune facture', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({ data: [], isPending: false, isError: false, refetch: vi.fn() })
    render(<InvoicesList />, { wrapper })
    expect(screen.getByText(/aucune facture/i)).toBeInTheDocument()
  })

  it('affiche le numéro de facture', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow({ data: { invoice_number: 'FA-2025-001', date: '2025-01-15' } })],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList />, { wrapper })
    expect(screen.getByText('FA-2025-001')).toBeInTheDocument()
  })

  it('affiche le badge "Payée" pour statut paid', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow({ status: 'paid' })],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList />, { wrapper })
    expect(screen.getByText('Payée')).toBeInTheDocument()
  })

  it('affiche le badge "Impayée" pour statut unpaid', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow({ status: 'unpaid' })],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList />, { wrapper })
    expect(screen.getByText('Impayée')).toBeInTheDocument()
  })

  it('affiche le bouton "Télécharger PDF" si file_url présent', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow({ data: { invoice_number: 'FA-001', file_url: 'https://example.com/invoice.pdf' } })],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList />, { wrapper })
    expect(screen.getByRole('link', { name: /télécharger pdf/i })).toBeInTheDocument()
  })

  it('affiche le bouton "Payer maintenant" pour factures impayées', () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow({ status: 'unpaid', data: { invoice_number: 'FA-001', payment_url: 'https://stripe.com/pay' } })],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList />, { wrapper })
    expect(screen.getByRole('link', { name: /payer maintenant/i })).toBeInTheDocument()
  })
})
