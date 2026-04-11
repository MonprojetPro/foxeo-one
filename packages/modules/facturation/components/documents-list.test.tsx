import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentsList } from './documents-list'
import type { BillingSyncRow } from '../types/billing.types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/use-billing', () => ({
  useBillingSyncRows: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    Skeleton: ({ className }: { className?: string }) => <div className={className} />,
  }
})

const { useBillingSyncRows } = await import('../hooks/use-billing')
const mockUseBillingSyncRows = vi.mocked(useBillingSyncRows)

const makeQuote = (overrides: Partial<BillingSyncRow> = {}): BillingSyncRow => ({
  id: 'q-1',
  entity_type: 'quote',
  pennylane_id: 'pen-q-1',
  client_id: 'client-1',
  status: 'pending',
  amount: 50000,
  data: { quote_number: 'DEVIS-001', date: '2026-03-01', file_url: 'https://pennylane.com/q.pdf' },
  last_synced_at: '2026-03-01T00:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
})

const makeInvoice = (overrides: Partial<BillingSyncRow> = {}): BillingSyncRow => ({
  id: 'inv-1',
  entity_type: 'invoice',
  pennylane_id: 'pen-inv-1',
  client_id: 'client-1',
  status: 'paid',
  amount: 23880,
  data: { invoice_number: 'FACT-001', date: '2026-02-01', file_url: null },
  last_synced_at: '2026-02-01T00:00:00Z',
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides,
})

function mockRows(quotes: BillingSyncRow[], invoices: BillingSyncRow[]) {
  mockUseBillingSyncRows.mockImplementation((entityType) => {
    if (entityType === 'quote') {
      return { data: quotes, isPending: false, isError: false } as ReturnType<typeof useBillingSyncRows>
    }
    return { data: invoices, isPending: false, isError: false } as ReturnType<typeof useBillingSyncRows>
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DocumentsList', () => {
  it('affiche le skeleton pendant le chargement', () => {
    mockUseBillingSyncRows.mockReturnValue({ data: [], isPending: true, isError: false } as ReturnType<typeof useBillingSyncRows>)
    render(<DocumentsList clientId="client-1" />)
    expect(screen.getByTestId('documents-skeleton')).toBeDefined()
  })

  it('affiche l\'état vide quand pas de documents', () => {
    mockRows([], [])
    render(<DocumentsList clientId="client-1" />)
    expect(screen.getByText('Vos factures et devis apparaîtront ici')).toBeDefined()
  })

  it('affiche les devis avec badge "Devis"', () => {
    mockRows([makeQuote()], [])
    render(<DocumentsList clientId="client-1" />)
    const badges = screen.getAllByTestId('document-type-badge')
    expect(badges[0].textContent).toBe('Devis')
  })

  it('affiche les factures avec badge "Facture"', () => {
    mockRows([], [makeInvoice()])
    render(<DocumentsList clientId="client-1" />)
    const badges = screen.getAllByTestId('document-type-badge')
    expect(badges[0].textContent).toBe('Facture')
  })

  it('affiche les badges de statut correctement', () => {
    mockRows([makeQuote({ status: 'pending' })], [makeInvoice({ status: 'paid' })])
    render(<DocumentsList clientId="client-1" />)
    const statusBadges = screen.getAllByTestId('document-status-badge')
    const texts = statusBadges.map((b) => b.textContent)
    expect(texts).toContain('En attente')
    expect(texts).toContain('Payée')
  })

  it('affiche le bouton PDF activé quand file_url est présent', () => {
    mockRows([makeQuote()], [])
    render(<DocumentsList clientId="client-1" />)
    const link = screen.getByRole('link', { name: 'Télécharger PDF' })
    expect(link.getAttribute('href')).toBe('https://pennylane.com/q.pdf')
  })

  it('affiche le bouton PDF désactivé quand file_url est absent', () => {
    mockRows([], [makeInvoice()])
    render(<DocumentsList clientId="client-1" />)
    expect(screen.queryByRole('link', { name: 'Télécharger PDF' })).toBeNull()
    expect(screen.getByTitle('PDF en cours de génération')).toBeDefined()
  })

  it('affiche un message d\'erreur quand le chargement échoue', () => {
    mockUseBillingSyncRows.mockReturnValue({ data: [], isPending: false, isError: true } as ReturnType<typeof useBillingSyncRows>)
    render(<DocumentsList clientId="client-1" />)
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Impossible de charger vos documents. Veuillez réessayer.')).toBeDefined()
  })
})
