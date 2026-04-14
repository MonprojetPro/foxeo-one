import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommunicationProfileForm } from './communication-profile-form'
import type { CommunicationProfile } from '@monprojetpro/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdateCommunicationProfile = vi.fn()

vi.mock('../actions/update-communication-profile', () => ({
  updateCommunicationProfile: (...args: unknown[]) => mockUpdateCommunicationProfile(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
      <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
    Input: ({ id, value, onChange, placeholder }: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input id={id} value={value} onChange={onChange} placeholder={placeholder} />
    ),
    Textarea: ({ id, value, onChange, placeholder, rows }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
      <textarea id={id} value={value as string} onChange={onChange} placeholder={placeholder} rows={rows} />
    ),
  }
})

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/utils')>()
  return {
    ...actual,
    DEFAULT_COMMUNICATION_PROFILE: {
      levelTechnical: 'intermediaire',
      styleExchange: 'conversationnel',
      adaptedTone: 'pro_decontracte',
      messageLength: 'moyen',
      tutoiement: false,
      concreteExamples: true,
      avoid: [],
      privilege: [],
      styleNotes: '',
    },
  }
})

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

const sampleProfile: CommunicationProfile = {
  levelTechnical: 'advanced',
  styleExchange: 'direct',
  adaptedTone: 'coach',
  messageLength: 'court',
  tutoiement: true,
  concreteExamples: false,
  avoid: ['jargon'],
  privilege: ['listes'],
  styleNotes: 'Note de test',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CommunicationProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateCommunicationProfile.mockResolvedValue({ data: sampleProfile, error: null })
  })

  it('renders with default profile when no initial profile provided', () => {
    render(<CommunicationProfileForm clientId={CLIENT_ID} />)

    expect(screen.getByLabelText(/niveau technique/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/style d.échange/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ton adapté/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/longueur des messages/i)).toBeInTheDocument()
  })

  it('renders with initial profile values', () => {
    render(<CommunicationProfileForm clientId={CLIENT_ID} initialProfile={sampleProfile} />)

    const levelSelect = screen.getByLabelText(/niveau technique/i) as HTMLSelectElement
    expect(levelSelect.value).toBe('advanced')

    const tutoiementCheckbox = screen.getByLabelText(/tutoiement/i) as HTMLInputElement
    expect(tutoiementCheckbox.checked).toBe(true)
  })

  it('shows avoid and privilege as comma-separated strings', () => {
    render(<CommunicationProfileForm clientId={CLIENT_ID} initialProfile={sampleProfile} />)

    const avoidInput = screen.getByLabelText(/à éviter/i) as HTMLInputElement
    expect(avoidInput.value).toBe('jargon')

    const privilegeInput = screen.getByLabelText(/à privilégier/i) as HTMLInputElement
    expect(privilegeInput.value).toBe('listes')
  })

  it('calls updateCommunicationProfile when save button clicked', async () => {
    render(<CommunicationProfileForm clientId={CLIENT_ID} initialProfile={sampleProfile} />)

    const saveButton = screen.getByRole('button', { name: /enregistrer le profil/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateCommunicationProfile).toHaveBeenCalledWith(
        CLIENT_ID,
        expect.objectContaining({
          levelTechnical: 'advanced',
          styleExchange: 'direct',
          adaptedTone: 'coach',
          tutoiement: true,
        })
      )
    })
  })

  it('parses comma-separated avoid string into array on save', async () => {
    render(<CommunicationProfileForm clientId={CLIENT_ID} initialProfile={sampleProfile} />)

    const avoidInput = screen.getByLabelText(/à éviter/i)
    fireEvent.change(avoidInput, { target: { value: 'jargon, questions ouvertes' } })

    const saveButton = screen.getByRole('button', { name: /enregistrer le profil/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateCommunicationProfile).toHaveBeenCalledWith(
        CLIENT_ID,
        expect.objectContaining({
          avoid: ['jargon', 'questions ouvertes'],
        })
      )
    })
  })

  it('shows success toast on successful save', async () => {
    const { showSuccess } = await import('@monprojetpro/ui')

    render(<CommunicationProfileForm clientId={CLIENT_ID} initialProfile={sampleProfile} />)

    const saveButton = screen.getByRole('button', { name: /enregistrer le profil/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Profil de communication enregistré')
    })
  })

  it('shows error toast on failed save', async () => {
    mockUpdateCommunicationProfile.mockResolvedValue({
      data: null,
      error: { message: 'Erreur', code: 'DATABASE_ERROR' },
    })
    const { showError } = await import('@monprojetpro/ui')

    render(<CommunicationProfileForm clientId={CLIENT_ID} initialProfile={sampleProfile} />)

    const saveButton = screen.getByRole('button', { name: /enregistrer le profil/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(showError).toHaveBeenCalled()
    })
  })
})
