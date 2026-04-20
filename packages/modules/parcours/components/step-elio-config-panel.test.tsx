import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StepElioConfigPanel } from './step-elio-config-panel'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockShowSuccess, mockShowError, mockInvalidateQueries, mockGetStepElioConfig, mockUpsertStepElioConfig } = vi.hoisted(() => ({
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
  mockInvalidateQueries: vi.fn().mockResolvedValue(undefined),
  mockGetStepElioConfig: vi.fn(),
  mockUpsertStepElioConfig: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: vi.fn(({ queryFn, onSuccess }: { queryFn: () => Promise<unknown>; onSuccess?: (data: unknown) => void }) => {
    const state = { isLoading: false, error: null as unknown }
    // Execute async in tests via manual control - we'll override per test
    return state
  }),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }
})

vi.mock('../actions/get-step-elio-config', () => ({
  getStepElioConfig: (...args: unknown[]) => mockGetStepElioConfig(...args),
}))

vi.mock('../actions/upsert-step-elio-config', () => ({
  upsertStepElioConfig: (...args: unknown[]) => mockUpsertStepElioConfig(...args),
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const STEP_ID = '00000000-0000-0000-0000-000000000001'
const mockOnClose = vi.fn()

const mockConfig = {
  id: '00000000-0000-0000-0000-000000000010',
  stepId: STEP_ID,
  personaName: 'Élio Branding',
  personaDescription: 'Expert en identité visuelle',
  systemPromptOverride: null,
  model: 'claude-sonnet-4-6',
  temperature: 0.8,
  maxTokens: 2000,
  customInstructions: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'

describe('StepElioConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertStepElioConfig.mockResolvedValue({ data: mockConfig, error: null })
    // Default: loaded with no config
    vi.mocked(useQuery).mockReturnValue({
      isLoading: false,
      error: null,
      data: null,
    } as ReturnType<typeof useQuery>)
  })

  it('shows skeleton while loading', () => {
    vi.mocked(useQuery).mockReturnValue({
      isLoading: true,
      error: null,
      data: undefined,
    } as ReturnType<typeof useQuery>)

    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows error message when load fails', () => {
    vi.mocked(useQuery).mockReturnValue({
      isLoading: false,
      error: new Error('Erreur serveur'),
      data: undefined,
    } as ReturnType<typeof useQuery>)

    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )
    expect(screen.getByText(/impossible de charger/i)).toBeInTheDocument()
    expect(screen.getByText(/erreur serveur/i)).toBeInTheDocument()
  })

  it('renders form with default values when no existing config', () => {
    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )
    expect(screen.getByLabelText(/nom du persona/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Élio')).toBeInTheDocument()
  })

  it('calls upsert with form data on save', async () => {
    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )

    fireEvent.change(screen.getByLabelText(/nom du persona/i), {
      target: { value: 'Élio Branding' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    await waitFor(() => {
      expect(mockUpsertStepElioConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: STEP_ID,
          personaName: 'Élio Branding',
        })
      )
    })
  })

  it('shows success toast and calls onClose after successful save', async () => {
    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('Configuration Élio sauvegardée')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('shows error toast when save fails', async () => {
    mockUpsertStepElioConfig.mockResolvedValue({ data: null, error: { message: 'Erreur serveur', code: 'DB_ERROR' } })

    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur serveur')
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  it('disables save button when personaName is empty', () => {
    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )
    fireEvent.change(screen.getByLabelText(/nom du persona/i), { target: { value: '' } })
    expect(screen.getByRole('button', { name: /sauvegarder/i })).toBeDisabled()
  })

  it('calls onClose when Annuler is clicked', () => {
    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('invalidates cache after successful save', async () => {
    render(
      <StepElioConfigPanel stepId={STEP_ID} stepTitle="Identité visuelle" stepNumber={1} onClose={mockOnClose} />
    )
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['elio-step-config', STEP_ID] })
      )
    })
  })
})
