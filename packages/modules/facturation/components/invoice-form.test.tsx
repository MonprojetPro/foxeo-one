import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { InvoiceForm } from './invoice-form'
import type { ClientWithPennylane } from '../types/billing.types'

// ============================================================
// T-036 — InvoiceForm : facture directe pour une prestation deja effectuee.
// ============================================================

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

vi.mock('../actions/create-invoice', () => ({
  createInvoice: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

import { createInvoice } from '../actions/create-invoice'
import { showSuccess, showError } from '@monprojetpro/ui'

const mockCreateInvoice = vi.mocked(createInvoice)
const mockShowSuccess = vi.mocked(showSuccess)
const mockShowError = vi.mocked(showError)

const CLIENT_UUID = '444f3b89-5303-459f-a128-dfb0df99abf7'

// Un client SANS compte Pennylane : le cas reel que l ancien filtre excluait
const mockClients: ClientWithPennylane[] = [
  {
    id: CLIENT_UUID,
    name: 'CSE HABITAT 77',
    company: 'CSE HABITAT 77',
    email: 'alex.rahli@habitat77.fr',
    pennylaneCustomerId: null,
  },
]

function okResult(overrides: Partial<{ invoiceNumber: string | null; emailSent: boolean }> = {}) {
  return {
    data: {
      pennylaneInvoiceId: '9100',
      invoiceNumber: overrides.invoiceNumber ?? 'FA-2026-001',
      emailSent: overrides.emailSent ?? true,
      totalHt: 1500,
    },
    error: null,
  }
}

async function fillOneLine() {
  await userEvent.selectOptions(screen.getByTestId('invoice-client-select'), CLIENT_UUID)
  await userEvent.type(screen.getByPlaceholderText('Prestation réalisée'), 'Audit CSE')

  const quantity = screen.getByLabelText('Qté')
  await userEvent.clear(quantity)
  await userEvent.type(quantity, '1')

  const price = screen.getByLabelText('Prix unitaire HT (€)')
  await userEvent.clear(price)
  await userEvent.type(price, '1500')
}

describe('InvoiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateInvoice.mockResolvedValue(okResult())
  })

  it('affiche un client sans compte Pennylane dans le selecteur', () => {
    render(<InvoiceForm clients={mockClients} />)
    expect(screen.getByRole('option', { name: /CSE HABITAT 77/ })).toBeInTheDocument()
  })

  it("annonce explicitement qu'aucun devis n'est cree", () => {
    render(<InvoiceForm clients={mockClients} />)
    expect(screen.getByText(/Pas de devis créé/)).toBeInTheDocument()
  })

  it('pre-remplit la date du jour et une echeance a 30 jours', () => {
    render(<InvoiceForm clients={mockClients} />)

    const today = new Date().toISOString().split('T')[0]
    const plus30 = new Date()
    plus30.setDate(plus30.getDate() + 30)

    expect(screen.getByLabelText("Date d'émission")).toHaveValue(today)
    expect(screen.getByLabelText('Échéance de paiement')).toHaveValue(
      plus30.toISOString().split('T')[0]
    )
  })

  it('calcule les totaux HT, TVA et TTC en temps reel', async () => {
    render(<InvoiceForm clients={mockClients} />)

    const price = screen.getByLabelText('Prix unitaire HT (€)')
    await userEvent.clear(price)
    await userEvent.type(price, '1000')

    await waitFor(() => {
      expect(screen.getByTestId('invoice-total-ht')).toHaveTextContent('1000.00 €')
      expect(screen.getByTestId('invoice-total-tva')).toHaveTextContent('200.00 €')
      expect(screen.getByTestId('invoice-total-ttc')).toHaveTextContent('1200.00 €')
    })
  })

  it('ajoute et retire des lignes', async () => {
    render(<InvoiceForm clients={mockClients} />)

    expect(screen.getAllByPlaceholderText('Prestation réalisée')).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }))
    expect(screen.getAllByPlaceholderText('Prestation réalisée')).toHaveLength(2)

    await userEvent.click(screen.getAllByText('Supprimer la ligne')[0])
    expect(screen.getAllByPlaceholderText('Prestation réalisée')).toHaveLength(1)
  })

  it('refuse de soumettre sans client selectionne', async () => {
    render(<InvoiceForm clients={mockClients} />)

    fireEvent.click(screen.getByTestId('invoice-submit-draft'))

    await waitFor(() => {
      expect(screen.getByText('Client requis')).toBeInTheDocument()
    })
    expect(mockCreateInvoice).not.toHaveBeenCalled()
  })

  it('refuse de soumettre une ligne sans designation', async () => {
    render(<InvoiceForm clients={mockClients} />)
    await userEvent.selectOptions(screen.getByTestId('invoice-client-select'), CLIENT_UUID)

    fireEvent.click(screen.getByTestId('invoice-submit-draft'))

    await waitFor(() => {
      expect(screen.getByText('Désignation requise')).toBeInTheDocument()
    })
    expect(mockCreateInvoice).not.toHaveBeenCalled()
  })

  it('cree la facture sans envoi quand on choisit « Créer sans envoyer »', async () => {
    render(<InvoiceForm clients={mockClients} />)
    await fillOneLine()

    fireEvent.click(screen.getByTestId('invoice-submit-draft'))

    await waitFor(() => {
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        CLIENT_UUID,
        [expect.objectContaining({ label: 'Audit CSE', quantity: 1, unitPrice: 1500, total: 1500 })],
        expect.objectContaining({ sendNow: false })
      )
    })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('FA-2026-001'))
  })

  it('cree et envoie la facture quand on choisit « Créer et envoyer »', async () => {
    render(<InvoiceForm clients={mockClients} />)
    await fillOneLine()

    fireEvent.click(screen.getByTestId('invoice-submit-send'))

    await waitFor(() => {
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        CLIENT_UUID,
        expect.any(Array),
        expect.objectContaining({ sendNow: true })
      )
    })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('envoyée'))
  })

  it("n annonce JAMAIS un envoi qui n a pas eu lieu", async () => {
    mockCreateInvoice.mockResolvedValue(okResult({ emailSent: false }))
    render(<InvoiceForm clients={mockClients} />)
    await fillOneLine()

    fireEvent.click(screen.getByTestId('invoice-submit-send'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("l'email n'est pas parti"))
    })
    // La facture existe : on ne doit pas laisser croire a un echec total
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('créée'))
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  it("remonte l erreur serveur sans annoncer de succes", async () => {
    mockCreateInvoice.mockResolvedValue({
      data: null,
      error: { message: 'Pennylane API error: 422', code: 'PENNYLANE_422' },
    })
    render(<InvoiceForm clients={mockClients} />)
    await fillOneLine()

    fireEvent.click(screen.getByTestId('invoice-submit-send'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Pennylane API error: 422')
    })
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  it('transmet les dates saisies a l action', async () => {
    render(<InvoiceForm clients={mockClients} />)
    await fillOneLine()

    fireEvent.change(screen.getByLabelText("Date d'émission"), { target: { value: '2026-09-30' } })
    fireEvent.change(screen.getByLabelText('Échéance de paiement'), {
      target: { value: '2026-10-30' },
    })

    fireEvent.click(screen.getByTestId('invoice-submit-draft'))

    await waitFor(() => {
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        CLIENT_UUID,
        expect.any(Array),
        expect.objectContaining({ date: '2026-09-30', deadline: '2026-10-30' })
      )
    })
  })

  it("refuse une echeance anterieure a la date d emission", async () => {
    render(<InvoiceForm clients={mockClients} />)
    await fillOneLine()

    fireEvent.change(screen.getByLabelText("Date d'émission"), { target: { value: '2026-10-06' } })
    fireEvent.change(screen.getByLabelText('Échéance de paiement'), {
      target: { value: '2026-10-01' },
    })

    fireEvent.click(screen.getByTestId('invoice-submit-draft'))

    await waitFor(() => {
      expect(screen.getByText(/L'échéance ne peut pas précéder/)).toBeInTheDocument()
    })
    expect(mockCreateInvoice).not.toHaveBeenCalled()
  })

  it("previent quand aucun client actif n est disponible", () => {
    render(<InvoiceForm clients={[]} />)
    expect(screen.getByText(/Crée d'abord la fiche client dans le CRM/)).toBeInTheDocument()
  })
})
