import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ElioObservations } from './elio-observations'
import type { ElioObservation } from '../actions/get-elio-observations'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockIntegrateObservation = vi.fn()

vi.mock('../actions/integrate-observation', () => ({
  integrateObservation: (...args: unknown[]) => mockIntegrateObservation(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    Button: ({ children, onClick, disabled, size, variant }: {
      children: React.ReactNode
      onClick?: () => void
      disabled?: boolean
      size?: string
      variant?: string
    }) => (
      <button onClick={onClick} disabled={disabled} data-size={size} data-variant={variant}>
        {children}
      </button>
    ),
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  }
})

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/utils')>()
  return {
    ...actual,
    formatRelativeDate: (date: string) => `relatif:${date}`,
  }
})

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

const sampleObservations: ElioObservation[] = [
  {
    messageId: 'msg-obs-1',
    observation: 'Client préfère les listes à puces',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    messageId: 'msg-obs-2',
    observation: 'Client répond mieux le matin',
    createdAt: '2026-03-02T09:00:00Z',
  },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ElioObservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIntegrateObservation.mockResolvedValue({ data: {}, error: null })
  })

  it('shows empty message when no observations', () => {
    render(<ElioObservations clientId={CLIENT_ID} observations={[]} />)
    expect(screen.getByText(/aucune observation/i)).toBeInTheDocument()
  })

  it('renders all observations', () => {
    render(<ElioObservations clientId={CLIENT_ID} observations={sampleObservations} />)

    expect(screen.getByText('Client préfère les listes à puces')).toBeInTheDocument()
    expect(screen.getByText('Client répond mieux le matin')).toBeInTheDocument()
  })

  it('shows Valider button for each observation', () => {
    render(<ElioObservations clientId={CLIENT_ID} observations={sampleObservations} />)

    const validateButtons = screen.getAllByRole('button', { name: /valider/i })
    expect(validateButtons).toHaveLength(2)
  })

  it('shows target selection buttons after clicking Valider', () => {
    render(<ElioObservations clientId={CLIENT_ID} observations={sampleObservations} />)

    const validateButtons = screen.getAllByRole('button', { name: /valider/i })
    fireEvent.click(validateButtons[0])

    expect(screen.getByRole('button', { name: /à éviter/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /à privilégier/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /notes libres/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
  })

  it('calls integrateObservation with correct target when À éviter clicked', async () => {
    render(<ElioObservations clientId={CLIENT_ID} observations={sampleObservations} />)

    const validateButtons = screen.getAllByRole('button', { name: /valider/i })
    fireEvent.click(validateButtons[0])

    const avoidButton = screen.getByRole('button', { name: /à éviter/i })
    fireEvent.click(avoidButton)

    await waitFor(() => {
      expect(mockIntegrateObservation).toHaveBeenCalledWith({
        clientId: CLIENT_ID,
        observation: 'Client préfère les listes à puces',
        target: 'avoid',
      })
    })
  })

  it('calls integrateObservation with privilege target', async () => {
    render(<ElioObservations clientId={CLIENT_ID} observations={sampleObservations} />)

    const validateButtons = screen.getAllByRole('button', { name: /valider/i })
    fireEvent.click(validateButtons[0])

    const privilegeButton = screen.getByRole('button', { name: /à privilégier/i })
    fireEvent.click(privilegeButton)

    await waitFor(() => {
      expect(mockIntegrateObservation).toHaveBeenCalledWith({
        clientId: CLIENT_ID,
        observation: 'Client préfère les listes à puces',
        target: 'privilege',
      })
    })
  })

  it('shows success toast on successful integration', async () => {
    const { showSuccess } = await import('@monprojetpro/ui')
    render(<ElioObservations clientId={CLIENT_ID} observations={sampleObservations} />)

    const validateButtons = screen.getAllByRole('button', { name: /valider/i })
    fireEvent.click(validateButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /à éviter/i }))

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Observation intégrée dans le profil de communication')
    })
  })

  it('calls onProfileUpdated after successful integration', async () => {
    const onProfileUpdated = vi.fn()
    render(
      <ElioObservations
        clientId={CLIENT_ID}
        observations={sampleObservations}
        onProfileUpdated={onProfileUpdated}
      />
    )

    const validateButtons = screen.getAllByRole('button', { name: /valider/i })
    fireEvent.click(validateButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /à éviter/i }))

    await waitFor(() => {
      expect(onProfileUpdated).toHaveBeenCalled()
    })
  })

  it('shows error toast on failed integration', async () => {
    mockIntegrateObservation.mockResolvedValue({
      data: null,
      error: { message: 'Erreur', code: 'DATABASE_ERROR' },
    })
    const { showError } = await import('@monprojetpro/ui')

    render(<ElioObservations clientId={CLIENT_ID} observations={sampleObservations} />)

    const validateButtons = screen.getAllByRole('button', { name: /valider/i })
    fireEvent.click(validateButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /à éviter/i }))

    await waitFor(() => {
      expect(showError).toHaveBeenCalled()
    })
  })

  it('hides dialog on Annuler click', () => {
    render(<ElioObservations clientId={CLIENT_ID} observations={sampleObservations} />)

    const validateButtons = screen.getAllByRole('button', { name: /valider/i })
    fireEvent.click(validateButtons[0])

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

    expect(screen.queryByRole('button', { name: /annuler/i })).not.toBeInTheDocument()
  })
})
