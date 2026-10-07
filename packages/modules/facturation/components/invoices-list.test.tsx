import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/use-billing', () => ({
  useBillingSyncRows: vi.fn(),
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

  // ── T-041 — l'avoir est reserve a l'operateur ─────────────────────────────
  //
  // Le verrou qui compte : CE MEME composant est rendu dans l'app CLIENT
  // (apps/client/.../modules/facturation et .../settings/billing). Un bouton
  // d'avoir visible par defaut serait donc sous les yeux du client.

  it("n'affiche PAS le bouton d'avoir par defaut — cas de l'app client", () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow()],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList />, { wrapper })
    expect(screen.queryByTestId('credit-note-button')).not.toBeInTheDocument()
  })

  it("affiche le bouton d'avoir quand allowCreditNote est demande — cas du Hub", () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow()],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList allowCreditNote />, { wrapper })
    expect(screen.getByTestId('credit-note-button')).toBeInTheDocument()
  })

  it("ouvre la modale d'avoir au clic", () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow()],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList allowCreditNote />, { wrapper })

    expect(screen.queryByTestId('credit-note-modal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('credit-note-button'))
    expect(screen.getByTestId('credit-note-modal')).toBeInTheDocument()
  })

  // ── T-041c — les avoirs doivent etre VISIBLES ────────────────────────────
  //
  // Ecrire une nouvelle entite sans brancher un seul lecteur : l'avoir
  // F-2026-102 existait en base et n'apparaissait nulle part a l'ecran.

  function makeCreditNote(creditedPennylaneId = 'pny-inv-1') {
    return {
      ...makeRow({ id: 'row-cn', pennylane_id: 'pny-cn-1', amount: -47880 }),
      entity_type: 'credit_note' as const,
      data: {
        invoice_number: 'F-2026-102',
        date: '2026-10-07',
        credited_invoice_pennylane_id: creditedPennylaneId,
        credited_invoice_number: 'FA-2025-001',
      },
    }
  }

  it("affiche l'avoir dans la liste, avec son badge", () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow(), makeCreditNote()],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList allowCreditNote />, { wrapper })

    expect(screen.getByText('F-2026-102')).toBeInTheDocument()
    expect(screen.getByText('Avoir')).toBeInTheDocument()
    expect(screen.getByText(/Annule la facture FA-2025-001/)).toBeInTheDocument()
  })

  it("charge bien les DEUX types d'entites", () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [], isPending: false, isError: false, refetch: vi.fn(),
    })
    render(<InvoicesList />, { wrapper })

    expect(useBillingSyncRows).toHaveBeenCalledWith(['invoice', 'credit_note'], undefined)
  })

  it("n'offre PAS d'emettre un avoir sur un avoir", () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeCreditNote()],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList allowCreditNote />, { wrapper })

    expect(screen.queryByTestId('credit-note-button')).not.toBeInTheDocument()
  })

  it("desactive le bouton sur une facture qui porte deja un avoir", () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow(), makeCreditNote('pny-inv-1')],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList allowCreditNote />, { wrapper })

    const button = screen.getByTestId('credit-note-button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Avoir déjà émis')
    expect(screen.getByText('Annulée par un avoir')).toBeInTheDocument()
  })

  it("laisse le bouton actif sur une facture dont l'avoir concerne une AUTRE facture", () => {
    ;(useBillingSyncRows as Mock).mockReturnValue({
      data: [makeRow(), makeCreditNote('pny-inv-AUTRE')],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<InvoicesList allowCreditNote />, { wrapper })

    expect(screen.getByTestId('credit-note-button')).toBeEnabled()
  })
})
