import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SubmitStepForm } from './submit-step-form'

// ─── Hoisted mocks (must be before other vi.mock calls) ───────────────────────

const { mockShowSuccess, mockShowError, mockPush, mockSubmitStep } = vi.hoisted(() => ({
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
  mockPush: vi.fn(),
  mockSubmitStep: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }
})

vi.mock('../actions/submit-step', () => ({
  submitStep: (...args: unknown[]) => mockSubmitStep(...args),
}))

vi.mock('./submission-file-upload', () => ({
  SubmissionFileUpload: ({ onFilesChange }: { onFilesChange: (f: File[]) => void }) => (
    <button
      type="button"
      data-testid="file-upload"
      onClick={() => onFilesChange([])}
    >
      Joindre
    </button>
  ),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

const STEP_ID = '00000000-0000-0000-0000-000000000010'

describe('SubmitStepForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the content textarea and submit button', () => {
    render(<SubmitStepForm stepId={STEP_ID} />)
    expect(screen.getByLabelText(/votre travail/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /soumettre pour validation/i })).toBeDefined()
  })

  it('shows validation error when content is too short', async () => {
    render(<SubmitStepForm stepId={STEP_ID} />)

    const textarea = screen.getByLabelText(/votre travail/i)
    fireEvent.change(textarea, { target: { value: 'court' } })

    const submitBtn = screen.getByRole('button', { name: /soumettre pour validation/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })

    expect(mockSubmitStep).not.toHaveBeenCalled()
  })

  it('calls submitStep with correct data on valid submit', async () => {
    mockSubmitStep.mockResolvedValue({ data: { submissionId: 'sub-id' }, error: null })

    render(<SubmitStepForm stepId={STEP_ID} />)

    const textarea = screen.getByLabelText(/votre travail/i)
    fireEvent.change(textarea, { target: { value: 'X'.repeat(50) } })

    const submitBtn = screen.getByRole('button', { name: /soumettre pour validation/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockSubmitStep).toHaveBeenCalledWith({
        stepId: STEP_ID,
        content: 'X'.repeat(50),
        files: undefined,
      })
    })
  })

  it('shows success toast and redirects on successful submit', async () => {
    mockSubmitStep.mockResolvedValue({ data: { submissionId: 'sub-id' }, error: null })

    render(<SubmitStepForm stepId={STEP_ID} />)

    const textarea = screen.getByLabelText(/votre travail/i)
    fireEvent.change(textarea, { target: { value: 'X'.repeat(50) } })

    fireEvent.click(screen.getByRole('button', { name: /soumettre pour validation/i }))

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/modules/parcours')
    })
  })

  it('shows error toast when submitStep returns an error', async () => {
    mockSubmitStep.mockResolvedValue({
      data: null,
      error: { message: 'Erreur serveur', code: 'DATABASE_ERROR' },
    })

    render(<SubmitStepForm stepId={STEP_ID} />)

    const textarea = screen.getByLabelText(/votre travail/i)
    fireEvent.change(textarea, { target: { value: 'X'.repeat(50) } })

    fireEvent.click(screen.getByRole('button', { name: /soumettre pour validation/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur serveur')
    })

    expect(mockPush).not.toHaveBeenCalled()
  })
})
