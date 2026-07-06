import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../actions/create-subscription', () => ({
  createSubscription: vi.fn().mockResolvedValue({ data: 'pl-sub-1', error: null }),
}))

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

describe('SubscriptionForm — grille v2', () => {
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

  it('displays commercial labels One / One+ with v2 prices', () => {
    render(<SubscriptionForm clients={mockClients} />)
    expect(screen.getByTestId('plan-essentiel')).toHaveTextContent('One')
    expect(screen.getByTestId('plan-essentiel')).toHaveTextContent('39 €/mois')
    expect(screen.getByTestId('plan-agentique')).toHaveTextContent('One+')
    expect(screen.getByTestId('plan-agentique')).toHaveTextContent('99 €/mois')
  })

  it('does not render the obsolete extras section', () => {
    render(<SubscriptionForm clients={mockClients} />)
    expect(screen.queryByTestId('extra-visio')).not.toBeInTheDocument()
    expect(screen.queryByText(/Modules supplémentaires/)).not.toBeInTheDocument()
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

  it('shows 39 €/mois total for default One plan', () => {
    render(<SubscriptionForm clients={mockClients} />)
    expect(screen.getByTestId('total-monthly')).toHaveTextContent('39.00')
  })

  it('shows 99 €/mois total when One+ is selected', () => {
    render(<SubscriptionForm clients={mockClients} />)
    fireEvent.click(screen.getByTestId('plan-agentique'))
    expect(screen.getByTestId('total-monthly')).toHaveTextContent('99.00')
  })

  it('calculates total for quarterly period (monthly * 3)', () => {
    render(<SubscriptionForm clients={mockClients} />)
    // One = 39 €/mois → 117 € / trimestre
    fireEvent.click(screen.getByTestId('frequency-quarterly'))
    expect(screen.getByTestId('total-period')).toHaveTextContent('117.00')
  })

  it('shows error when submitting without selecting a client', async () => {
    render(<SubscriptionForm clients={mockClients} />)
    fireEvent.click(screen.getByTestId('create-subscription-btn'))
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Sélectionnez un client')
    })
    expect(mockCreateSubscription).not.toHaveBeenCalled()
  })

  it('calls createSubscription with correct parameters on valid submit (no extras)', async () => {
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
        })
      )
    })
    // Grille v2 : plus de champ extras dans l'input
    const callArg = mockCreateSubscription.mock.calls[0][0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('extras')
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

  it('calls onSuccess callback after successful creation', async () => {
    const onSuccess = vi.fn()
    render(<SubscriptionForm clients={mockClients} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByTestId('client-select'), {
      target: { value: 'client-1' },
    })
    fireEvent.click(screen.getByTestId('create-subscription-btn'))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows empty state message when no clients with Pennylane', () => {
    render(<SubscriptionForm clients={[]} />)
    expect(screen.getByText(/Aucun client avec un compte Pennylane/)).toBeInTheDocument()
  })
})
