import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { QuoteForm } from './quote-form'
import type { ClientWithPennylane } from '../types/billing.types'

// QuoteForm utilise useQueryClient (Story 13.4 patch) → besoin du provider TanStack
function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../actions/create-quote', () => ({
  createAndSendQuote: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

import { createAndSendQuote } from '../actions/create-quote'
import { showSuccess, showError } from '@monprojetpro/ui'

const mockCreateAndSendQuote = vi.mocked(createAndSendQuote)
const mockShowSuccess = vi.mocked(showSuccess)
const mockShowError = vi.mocked(showError)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLIENT_1_UUID = '00000000-0000-0000-0000-000000000001'
const CLIENT_2_UUID = '00000000-0000-0000-0000-000000000002'

const mockClients: ClientWithPennylane[] = [
  {
    id: CLIENT_1_UUID,
    name: 'ACME Corp',
    company: 'ACME Corp',
    email: 'acme@example.com',
    pennylaneCustomerId: 'pl-cust-1',
  },
  {
    id: CLIENT_2_UUID,
    name: 'Beta Ltd',
    company: 'Beta Ltd',
    email: 'beta@example.com',
    pennylaneCustomerId: 'pl-cust-2',
  },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuoteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateAndSendQuote.mockResolvedValue({ data: 'quote-123', error: null })
  })

  it('renders form with client selector and one default line item', () => {
    render(<QuoteForm clients={mockClients} />)

    expect(screen.getByLabelText(/client/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/désignation/i)).toBeInTheDocument()
    expect(screen.getByText(/créer sans envoyer/i)).toBeInTheDocument()
    expect(screen.getByText(/créer et envoyer au client/i)).toBeInTheDocument()
  })

  it('shows client options in dropdown', async () => {
    render(<QuoteForm clients={mockClients} />)

    const select = screen.getByLabelText(/client/i)
    fireEvent.change(select, { target: { value: CLIENT_1_UUID } })

    expect((select as HTMLSelectElement).value).toBe(CLIENT_1_UUID)
  })

  it('calculates total HT from line item quantity and unit price', async () => {
    render(<QuoteForm clients={mockClients} />)

    const qtyInput = screen.getByPlaceholderText(/qté/i)
    const priceInput = screen.getByPlaceholderText(/prix unitaire/i)

    await userEvent.clear(qtyInput)
    await userEvent.type(qtyInput, '3')
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '100')

    await waitFor(() => {
      expect(screen.getByTestId('total-ht')).toHaveTextContent('300')
    })
  })

  it('calculates TVA at 20% by default', async () => {
    render(<QuoteForm clients={mockClients} />)

    const qtyInput = screen.getByPlaceholderText(/qté/i)
    const priceInput = screen.getByPlaceholderText(/prix unitaire/i)

    await userEvent.clear(qtyInput)
    await userEvent.type(qtyInput, '1')
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '100')

    await waitFor(() => {
      expect(screen.getByTestId('total-tva')).toHaveTextContent('20')
    })
  })

  it('calculates total TTC correctly', async () => {
    render(<QuoteForm clients={mockClients} />)

    const qtyInput = screen.getByPlaceholderText(/qté/i)
    const priceInput = screen.getByPlaceholderText(/prix unitaire/i)

    await userEvent.clear(qtyInput)
    await userEvent.type(qtyInput, '2')
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '50')

    await waitFor(() => {
      expect(screen.getByTestId('total-ttc')).toHaveTextContent('120')
    })
  })

  it('can add a new line item', async () => {
    render(<QuoteForm clients={mockClients} />)

    const addButton = screen.getByRole('button', { name: /ajouter une ligne/i })
    await userEvent.click(addButton)

    const labelInputs = screen.getAllByPlaceholderText(/désignation/i)
    expect(labelInputs).toHaveLength(2)
  })

  it('shows validation error when clientId is missing on submit', async () => {
    render(<QuoteForm clients={mockClients} />)

    const saveButton = screen.getByText(/créer sans envoyer/i)
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/client requis/i)).toBeInTheDocument()
    })
    expect(mockCreateAndSendQuote).not.toHaveBeenCalled()
  })

  it('calls createAndSendQuote with sendNow=false when saving as draft', async () => {
    render(<QuoteForm clients={mockClients} />)

    const select = screen.getByLabelText(/client/i)
    fireEvent.change(select, { target: { value: CLIENT_1_UUID } })

    const labelInput = screen.getByPlaceholderText(/désignation/i)
    await userEvent.type(labelInput, 'Prestation conseil')

    const saveButton = screen.getByText(/créer sans envoyer/i)
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(mockCreateAndSendQuote).toHaveBeenCalledWith(
        CLIENT_1_UUID,
        expect.arrayContaining([expect.objectContaining({ label: 'Prestation conseil' })]),
        expect.objectContaining({ sendNow: false })
      )
    })
  })
})
