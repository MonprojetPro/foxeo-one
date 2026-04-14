import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuotesList } from './quotes-list'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('../actions/create-quote', () => ({
  createAndSendQuote: vi.fn(),
}))

vi.mock('../actions/convert-quote-to-invoice', () => ({
  convertQuoteToInvoice: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

import { useQuery } from '@tanstack/react-query'
import { showSuccess } from '@monprojetpro/ui'

const mockUseQuery = vi.mocked(useQuery)
const mockShowSuccess = vi.mocked(showSuccess)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockClients = [
  { id: 'client-1', name: 'ACME Corp', company: 'ACME Corp', email: 'acme@example.com', pennylaneCustomerId: 'pl-1' },
  { id: 'client-2', name: 'Beta Ltd', company: 'Beta Ltd', email: 'beta@example.com', pennylaneCustomerId: 'pl-2' },
]

const mockSyncRows = [
  {
    id: 'sync-1',
    entity_type: 'quote',
    pennylane_id: 'pl-quote-1',
    client_id: 'client-1',
    status: 'pending',
    amount: 120000,
    data: { quote_number: 'DEV-001', date: '2026-03-07', deadline: '2026-04-06' },
    last_synced_at: '2026-03-07T00:00:00Z',
    created_at: '2026-03-07T00:00:00Z',
  },
  {
    id: 'sync-2',
    entity_type: 'quote',
    pennylane_id: 'pl-quote-2',
    client_id: 'client-2',
    status: 'accepted',
    amount: 60000,
    data: { quote_number: 'DEV-002', date: '2026-03-01', deadline: '2026-03-31' },
    last_synced_at: '2026-03-07T00:00:00Z',
    created_at: '2026-03-01T00:00:00Z',
  },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuotesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton while loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    expect(screen.getByTestId('quotes-skeleton')).toBeInTheDocument()
  })

  it('renders quote rows with number, status badge, and amount', () => {
    mockUseQuery.mockReturnValue({ data: mockSyncRows, isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    expect(screen.getByText('DEV-001')).toBeInTheDocument()
    expect(screen.getByText('DEV-002')).toBeInTheDocument()
  })

  it('displays correct status badges with colors', () => {
    mockUseQuery.mockReturnValue({ data: mockSyncRows, isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    // "En attente" appears in filter button + badge → use getAllByText
    const enAttenteElements = screen.getAllByText(/en attente/i)
    expect(enAttenteElements.length).toBeGreaterThanOrEqual(1)

    // "Accepté" appears only in the badge (filter says "Acceptés" — different)
    expect(screen.getByText('Accepté')).toBeInTheDocument()
  })

  it('shows empty state when no quotes exist', () => {
    mockUseQuery.mockReturnValue({ data: [], isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    expect(screen.getByText(/aucun devis/i)).toBeInTheDocument()
  })

  it('shows error state when query fails', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: false, isError: true, error: new Error('DB error') } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    expect(screen.getByText(/erreur/i)).toBeInTheDocument()
  })

  it('shows Relancer button for pending quotes', () => {
    mockUseQuery.mockReturnValue({ data: mockSyncRows, isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    expect(screen.getByText('Relancer')).toBeInTheDocument()
  })

  it('shows Annuler button for pending quotes', () => {
    mockUseQuery.mockReturnValue({ data: mockSyncRows, isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })

  it('shows Convertir en facture button for accepted quotes', () => {
    mockUseQuery.mockReturnValue({ data: mockSyncRows, isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    expect(screen.getByText('Convertir en facture')).toBeInTheDocument()
  })

  it('renders client filter dropdown when clients are provided', () => {
    mockUseQuery.mockReturnValue({ data: mockSyncRows, isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList clients={mockClients} />)

    expect(screen.getByLabelText(/filtrer par client/i)).toBeInTheDocument()
  })

  it('renders period filter dropdown', () => {
    mockUseQuery.mockReturnValue({ data: mockSyncRows, isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    expect(screen.getByLabelText(/filtrer par période/i)).toBeInTheDocument()
  })

  it('calls showSuccess when Relancer is clicked', async () => {
    mockUseQuery.mockReturnValue({ data: mockSyncRows, isPending: false, isError: false } as ReturnType<typeof useQuery>)

    render(<QuotesList />)

    await userEvent.click(screen.getByText('Relancer'))

    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('Relance envoyée'))
  })
})
