import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PendingReminders } from './pending-reminders'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  }
})

vi.mock('../actions/get-pending-reminders', () => ({
  getPendingReminders: vi.fn(async () => ({ data: [], error: null })),
  getReminderHistory: vi.fn(async () => ({ data: [], error: null })),
}))

vi.mock('./reminder-modal', () => ({
  ReminderModal: vi.fn(({ onClose }) => (
    <div data-testid="reminder-modal-mock">
      <button onClick={onClose}>Fermer</button>
    </div>
  )),
}))

const REMINDER_STUB = {
  id: 'rem-1',
  client_id: 'client-1',
  invoice_id: 'inv-1',
  invoice_number: 'F-2026-001',
  invoice_amount: 1500,
  invoice_date: '2026-04-01',
  reminder_level: 1 as const,
  status: 'pending' as const,
  generated_body: 'Rappel de paiement.',
  sent_at: null,
  channel: null,
  created_at: '2026-04-08T08:00:00Z',
  updated_at: '2026-04-08T08:00:00Z',
  client_email: 'marie@example.com',
  client_name: 'Marie Dupont',
  has_communication_profile: true,
}

import { useQuery } from '@tanstack/react-query'

describe('PendingReminders — état vide', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isPending: false,
    } as ReturnType<typeof useQuery>)
  })

  it('affiche le message état vide', () => {
    render(<PendingReminders />)
    expect(screen.getByTestId('reminders-empty')).toBeTruthy()
    expect(screen.getByText('Aucune relance en attente')).toBeTruthy()
  })
})

describe('PendingReminders — liste avec relances', () => {
  beforeEach(() => {
    // Premier appel = pending, deuxième = history (vide)
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: [REMINDER_STUB], isPending: false } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: [], isPending: false } as ReturnType<typeof useQuery>)
  })

  it('affiche la liste avec le client et la facture', () => {
    render(<PendingReminders />)
    expect(screen.getByTestId('reminders-list')).toBeTruthy()
    expect(screen.getByText('Marie Dupont')).toBeTruthy()
    expect(screen.getByText(/F-2026-001/)).toBeTruthy()
  })

  it('affiche le bouton "Voir & Envoyer"', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: [REMINDER_STUB], isPending: false } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: [], isPending: false } as ReturnType<typeof useQuery>)
    render(<PendingReminders />)
    expect(screen.getByTestId('btn-open-reminder-rem-1')).toBeTruthy()
  })
})

describe('PendingReminders — ouverture modal', () => {
  beforeEach(() => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: [REMINDER_STUB], isPending: false } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: [], isPending: false } as ReturnType<typeof useQuery>)
  })

  it('ouvre le modal au clic sur "Voir & Envoyer"', () => {
    render(<PendingReminders />)
    const btn = screen.getByTestId('btn-open-reminder-rem-1')
    fireEvent.click(btn)
    expect(screen.getByTestId('reminder-modal-mock')).toBeTruthy()
  })

  it('ferme le modal au clic Fermer', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: [REMINDER_STUB], isPending: false } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: [], isPending: false } as ReturnType<typeof useQuery>)
    render(<PendingReminders />)
    fireEvent.click(screen.getByTestId('btn-open-reminder-rem-1'))
    fireEvent.click(screen.getByText('Fermer'))
    expect(screen.queryByTestId('reminder-modal-mock')).toBeNull()
  })
})
