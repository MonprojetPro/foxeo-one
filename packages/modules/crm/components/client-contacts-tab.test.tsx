import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { ClientContactsTab } from './client-contacts-tab'
import type { ClientContact } from '../types/crm.types'

// ============================================================
// T-039 — ce que MiKL voit du carnet.
//
// Le verrou qui compte : l'ecran doit DIRE a qui partent les factures. Un carnet
// qui liste des gens sans repondre a cette question laisserait exactement le trou
// qu'il est cense boucher.
// ============================================================

vi.mock('../actions/get-client-contacts', () => ({ getClientContacts: vi.fn() }))
vi.mock('../actions/create-client-contact', () => ({ createClientContact: vi.fn() }))
vi.mock('../actions/update-client-contact', () => ({ updateClientContact: vi.fn() }))
vi.mock('../actions/delete-client-contact', () => ({ deleteClientContact: vi.fn() }))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})

import { getClientContacts } from '../actions/get-client-contacts'
import { deleteClientContact } from '../actions/delete-client-contact'
import { showSuccess } from '@monprojetpro/ui'

const mockGet = vi.mocked(getClientContacts)
const mockDelete = vi.mocked(deleteClientContact)
const mockShowSuccess = vi.mocked(showSuccess)

const CLIENT_ID = '444f3b89-5303-459f-a128-dfb0df99abf7'

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

function contact(partial: Partial<ClientContact>): ClientContact {
  return {
    id: 'contact-1',
    clientId: CLIENT_ID,
    operatorId: 'op-1',
    fullName: 'Marie Dupont',
    email: 'compta@habitat77.fr',
    note: null,
    receivesInvoices: false,
    showOnInvoice: false,
    createdAt: '2026-10-08T10:00:00Z',
    updatedAt: '2026-10-08T10:00:00Z',
    ...partial,
  }
}

describe('ClientContactsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: [], error: null })
  })

  it('previent quand AUCUN contact ne recoit les factures, et nomme l adresse de repli', async () => {
    render(<ClientContactsTab clientId={CLIENT_ID} clientEmail="login@habitat77.fr" />)

    await waitFor(() => {
      expect(screen.getByTestId('contacts-no-recipient')).toBeInTheDocument()
    })
    expect(screen.getByTestId('contacts-no-recipient')).toHaveTextContent('login@habitat77.fr')
  })

  it('annonce a qui partent les factures, et a l attention de qui', async () => {
    mockGet.mockResolvedValue({
      data: [
        contact({ id: 'c1', fullName: 'Alex Rahli', email: 'alex@habitat77.fr', showOnInvoice: true }),
        contact({ id: 'c2', fullName: 'Marie Dupont', email: 'compta@habitat77.fr', receivesInvoices: true }),
      ],
      error: null,
    })

    render(<ClientContactsTab clientId={CLIENT_ID} clientEmail="login@habitat77.fr" />)

    await waitFor(() => {
      expect(screen.getByTestId('contacts-recipients-summary')).toBeInTheDocument()
    })
    const summary = screen.getByTestId('contacts-recipients-summary')
    // L'adresse de la comptable, le nom du secretaire : les deux cases sont bien
    // independantes jusque dans ce qui s'affiche.
    expect(summary).toHaveTextContent('compta@habitat77.fr')
    expect(summary).toHaveTextContent('Alex Rahli')
    expect(screen.queryByTestId('contacts-no-recipient')).not.toBeInTheDocument()
  })

  it('affiche les deux pastilles separement', async () => {
    mockGet.mockResolvedValue({
      data: [contact({ receivesInvoices: true, showOnInvoice: true })],
      error: null,
    })

    render(<ClientContactsTab clientId={CLIENT_ID} clientEmail="login@habitat77.fr" />)

    await waitFor(() => {
      expect(screen.getByText('Reçoit les factures')).toBeInTheDocument()
    })
    expect(screen.getByText('Nom imprimé sur la facture')).toBeInTheDocument()
  })

  it('affiche un contact sans adresse e-mail sans le faire passer pour un destinataire', async () => {
    mockGet.mockResolvedValue({ data: [contact({ email: null })], error: null })

    render(<ClientContactsTab clientId={CLIENT_ID} clientEmail="login@habitat77.fr" />)

    await waitFor(() => {
      expect(screen.getByText("Pas d'adresse e-mail")).toBeInTheDocument()
    })
    expect(screen.queryByText('Reçoit les factures')).not.toBeInTheDocument()
  })

  it('demande confirmation avant de supprimer, et previent quand c est le dernier destinataire', async () => {
    mockGet.mockResolvedValue({
      data: [contact({ receivesInvoices: true })],
      error: null,
    })

    render(<ClientContactsTab clientId={CLIENT_ID} clientEmail="login@habitat77.fr" />)

    await waitFor(() => expect(screen.getByTestId('contact-card')).toBeInTheDocument())
    await userEvent.click(screen.getByLabelText('Supprimer Marie Dupont'))

    expect(screen.getByText(/Supprimer « Marie Dupont » du carnet/)).toBeInTheDocument()
    expect(screen.getByText(/seul destinataire des factures/)).toBeInTheDocument()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('dit ou repartiront les factures apres la suppression du dernier destinataire', async () => {
    mockGet.mockResolvedValue({ data: [contact({ receivesInvoices: true })], error: null })
    mockDelete.mockResolvedValue({
      data: { remainingRecipients: 0, fallbackEmail: 'login@habitat77.fr' },
      error: null,
    })

    render(<ClientContactsTab clientId={CLIENT_ID} clientEmail="login@habitat77.fr" />)

    await waitFor(() => expect(screen.getByTestId('contact-card')).toBeInTheDocument())
    await userEvent.click(screen.getByLabelText('Supprimer Marie Dupont'))
    await userEvent.click(screen.getByTestId('contact-delete-confirm'))

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.stringContaining('plus aucun destinataire de facturation')
      )
    })
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('login@habitat77.fr'))
  })

  it('remonte une erreur de chargement au lieu d afficher un carnet vide trompeur', async () => {
    mockGet.mockResolvedValue({ data: null, error: { message: 'RLS denied', code: 'FETCH_FAILED' } })

    render(<ClientContactsTab clientId={CLIENT_ID} clientEmail="login@habitat77.fr" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('RLS denied')
    })
  })
})
