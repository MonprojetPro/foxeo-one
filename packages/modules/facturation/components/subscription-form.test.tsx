import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../actions/create-subscription', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../actions/create-subscription')>()
  return {
    ...actual,
    createSubscription: vi.fn().mockResolvedValue({ data: 'pl-sub-1', error: null }),
  }
})

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

import { createSubscription } from '../actions/create-subscription'
import { showSuccess, showError } from '@monprojetpro/ui'
import { SubscriptionForm } from './subscription-form'
import type { ClientWithPennylane } from '../types/billing.types'

const mockCreateSubscription = vi.mocked(createSubscription)
const mockShowSuccess = vi.mocked(showSuccess)
const mockShowError = vi.mocked(showError)

const mockClients: ClientWithPennylane[] = [
  { id: 'client-1', name: 'ACME Corp', company: null, email: 'acme@example.com', pennylaneCustomerId: 'pl-1' },
  { id: 'client-2', name: 'Beta Inc', company: 'Beta Inc', email: 'beta@example.com', pennylaneCustomerId: 'pl-2' },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SubscriptionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateSubscription.mockResolvedValue({ data: 'pl-sub-1', error: null })
  })

  it('renders all plan options', () => {
    render(<SubscriptionForm clients={mockClients} />)
    expect(screen.getByTestId('plan-ponctuel')).toBeInTheDocument()
    expect(screen.getByTestId('plan-essentiel')).toBeInTheDocument()
    expect(screen.getByTestId('plan-agentique')).toBeInTheDocument()
  })

  it('renders all frequency options', () => {
    render(<SubscriptionForm clients={mockClients} />)
    expect(screen.getByTestId('frequency-monthly')).toBeInTheDocument()
    expect(screen.getByTestId('frequency-quarterly')).toBeInTheDocument()
    expect(screen.getByTestId('frequency-yearly')).toBeInTheDocument()
  })

  it('renders all payment method options', () => {
    render(<SubscriptionForm clients={mockClients} />)
    expect(screen.getByTestId('payment-cb')).toBeInTheDocument()
    expect(screen.getByTestId('payment-virement')).toBeInTheDocument()
    expect(screen.getByTestId('payment-sepa')).toBeInTheDocument()
  })

  it('shows custom amount input only when plan=ponctuel', () => {
    render(<SubscriptionForm clients={mockClients} />)
    expect(screen.queryByTestId('custom-amount')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('plan-ponctuel'))
    expect(screen.getByTestId('custom-amount')).toBeInTheDocument()
  })

  it('calculates total monthly = base + selected extras', async () => {
    render(<SubscriptionForm clients={mockClients} />)
    // Default plan: essentiel = 49€/mois
    expect(screen.getByTestId('base-monthly')).toHaveTextContent('49.00')
    expect(screen.getByTestId('total-monthly')).toHaveTextContent('49.00')

    // Select visio extra (+19€)
    fireEvent.click(screen.getByTestId('extra-visio'))
    expect(screen.getByTestId('total-monthly')).toHaveTextContent('68.00')
  })

  it('calculates total for quarterly period (monthly * 3)', () => {
    render(<SubscriptionForm clients={mockClients} />)
    // essentiel = 49€/mois
    fireEvent.click(screen.getByTestId('frequency-quarterly'))
    expect(screen.getByTestId('total-period')).toHaveTextContent('147.00')
  })

  it('shows error when submitting without selecting a client', async () => {
    render(<SubscriptionForm clients={mockClients} />)
    fireEvent.click(screen.getByTestId('create-subscription-btn'))
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Sélectionnez un client')
    })
    expect(mockCreateSubscription).not.toHaveBeenCalled()
  })

  it('calls createSubscription with correct parameters on valid submit', async () => {
    render(<SubscriptionForm clients={mockClients} />)

    fireEvent.change(screen.getByTestId('client-select'), {
      target: { value: 'client-1' },
    })
    fireEvent.click(screen.getByTestId('create-subscription-btn'))

    await waitFor(() => {
      expect(mockCreateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-1',
          plan: 'essentiel',
          frequency: 'monthly',
          paymentMethod: 'cb',
          extras: [],
        })
      )
    })
  })

  it('shows success toast after successful subscription creation', async () => {
    render(<SubscriptionForm clients={mockClients} />)

    fireEvent.change(screen.getByTestId('client-select'), {
      target: { value: 'client-1' },
    })
    fireEvent.click(screen.getByTestId('create-subscription-btn'))

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.stringContaining('ACME Corp')
      )
    })
  })

  it('shows error toast when createSubscription fails', async () => {
    mockCreateSubscription.mockResolvedValue({
      data: null,
      error: { message: 'Pennylane error', code: 'PENNYLANE_ERROR' },
    })

    render(<SubscriptionForm clients={mockClients} />)
    fireEvent.change(screen.getByTestId('client-select'), {
      target: { value: 'client-1' },
    })
    fireEvent.click(screen.getByTestId('create-subscription-btn'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Pennylane error')
    })
  })

  it('shows empty state message when no clients with Pennylane', () => {
    render(<SubscriptionForm clients={[]} />)
    expect(screen.getByText(/Aucun client avec un compte Pennylane/)).toBeInTheDocument()
  })
})
