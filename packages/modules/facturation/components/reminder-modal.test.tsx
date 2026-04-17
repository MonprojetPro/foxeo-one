import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReminderModal } from './reminder-modal'
import type { CollectionReminderWithClient } from '../types/billing.types'

vi.mock('../actions/send-reminder', () => ({
  sendReminder: vi.fn(async () => ({ data: { sent: true }, error: null })),
}))

vi.mock('../actions/cancel-reminder', () => ({
  cancelReminder: vi.fn(async () => ({ data: { cancelled: true }, error: null })),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

const REMINDER_STUB: CollectionReminderWithClient = {
  id: 'rem-uuid-1',
  client_id: 'client-uuid-1',
  invoice_id: 'inv-pln-1',
  invoice_number: 'F-2026-001',
  invoice_amount: 1500,
  invoice_date: '2026-04-01',
  reminder_level: 1,
  status: 'pending',
  generated_body: 'Bonjour Marie, votre facture F-2026-001 reste impayée.',
  sent_at: null,
  channel: null,
  created_at: '2026-04-08T08:00:00Z',
  updated_at: '2026-04-08T08:00:00Z',
  client_email: 'marie@example.com',
  client_name: 'Marie Dupont',
  has_communication_profile: true,
}

describe('ReminderModal — rendu', () => {
  it('affiche le numéro de facture et le destinataire', () => {
    render(
      <ReminderModal
        reminder={REMINDER_STUB}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )

    expect(screen.getAllByText(/F-2026-001/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('recipient-email').textContent).toBe('marie@example.com')
  })

  it('affiche le badge "Adapté au ton du client" si profil présent', () => {
    render(
      <ReminderModal
        reminder={REMINDER_STUB}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )
    expect(screen.getByTestId('profile-badge')).toBeTruthy()
  })

  it('ne affiche pas le badge si pas de profil', () => {
    render(
      <ReminderModal
        reminder={{ ...REMINDER_STUB, has_communication_profile: false }}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )
    expect(screen.queryByTestId('profile-badge')).toBeNull()
  })

  it('affiche le corps généré par Élio dans la textarea', () => {
    render(
      <ReminderModal
        reminder={REMINDER_STUB}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )
    const textarea = screen.getByTestId('reminder-body') as HTMLTextAreaElement
    expect(textarea.value).toContain('Marie')
  })
})

describe('ReminderModal — modification du corps', () => {
  it('permet de modifier le corps du message', () => {
    render(
      <ReminderModal
        reminder={REMINDER_STUB}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )
    const textarea = screen.getByTestId('reminder-body') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Nouveau texte de relance.' } })
    expect(textarea.value).toBe('Nouveau texte de relance.')
  })
})

describe('ReminderModal — sélection canal', () => {
  it('affiche les 3 boutons de canal', () => {
    render(
      <ReminderModal
        reminder={REMINDER_STUB}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )
    expect(screen.getByTestId('channel-email')).toBeTruthy()
    expect(screen.getByTestId('channel-chat')).toBeTruthy()
    expect(screen.getByTestId('channel-both')).toBeTruthy()
  })

  it('canal email est sélectionné par défaut', () => {
    render(
      <ReminderModal
        reminder={REMINDER_STUB}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )
    const emailBtn = screen.getByTestId('channel-email')
    expect(emailBtn.className).toContain('bg-primary')
  })

  it('change le canal sélectionné au clic', () => {
    render(
      <ReminderModal
        reminder={REMINDER_STUB}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )
    const chatBtn = screen.getByTestId('channel-chat')
    fireEvent.click(chatBtn)
    expect(chatBtn.className).toContain('bg-primary')
    expect(screen.getByTestId('channel-email').className).not.toContain('bg-primary')
  })
})
