import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ValidateSubmissionForm } from './validate-submission-form'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockShowSuccess, mockShowError, mockPush, mockValidateSubmission, mockInvalidateQueries } = vi.hoisted(() => ({
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
  mockPush: vi.fn(),
  mockValidateSubmission: vi.fn(),
  mockInvalidateQueries: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }
})

vi.mock('../actions/validate-submission', () => ({
  validateSubmission: (...args: unknown[]) => mockValidateSubmission(...args),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

const SUBMISSION_ID = '00000000-0000-0000-0000-000000000099'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'

describe('ValidateSubmissionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders decision buttons and confirm button', () => {
    render(<ValidateSubmissionForm submissionId={SUBMISSION_ID} clientId={CLIENT_ID} />)

    // Decision buttons (exact text)
    expect(screen.getAllByRole('button', { name: /approuver/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /révision/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /refuser/i })).toBeDefined()
    // Confirm button contains "Confirmer"
    expect(screen.getByRole('button', { name: /confirmer/i })).toBeDefined()
  })

  it('shows feedback textarea when "Demander une révision" is selected', () => {
    render(<ValidateSubmissionForm submissionId={SUBMISSION_ID} clientId={CLIENT_ID} />)

    fireEvent.click(screen.getByRole('button', { name: /révision/i }))

    expect(screen.getByLabelText(/commentaire/i)).toBeDefined()
  })

  it('shows feedback textarea when "Refuser" is selected', () => {
    render(<ValidateSubmissionForm submissionId={SUBMISSION_ID} clientId={CLIENT_ID} />)

    fireEvent.click(screen.getByRole('button', { name: /refuser/i }))

    expect(screen.getByLabelText(/commentaire/i)).toBeDefined()
  })

  it('does not show feedback textarea when "Approuver" is selected (default)', () => {
    render(<ValidateSubmissionForm submissionId={SUBMISSION_ID} clientId={CLIENT_ID} />)

    expect(screen.queryByLabelText(/commentaire/i)).toBeNull()
  })

  it('calls validateSubmission with approved decision', async () => {
    mockValidateSubmission.mockResolvedValue({ data: { stepCompleted: true }, error: null })

    render(<ValidateSubmissionForm submissionId={SUBMISSION_ID} clientId={CLIENT_ID} />)

    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }))

    await waitFor(() => {
      expect(mockValidateSubmission).toHaveBeenCalledWith({
        submissionId: SUBMISSION_ID,
        decision: 'approved',
        feedback: undefined,
      })
    })
  })

  it('calls validateSubmission with revision feedback', async () => {
    mockValidateSubmission.mockResolvedValue({ data: { stepCompleted: false }, error: null })

    render(<ValidateSubmissionForm submissionId={SUBMISSION_ID} clientId={CLIENT_ID} />)

    fireEvent.click(screen.getByRole('button', { name: /révision/i }))

    const textarea = screen.getByLabelText(/commentaire/i)
    fireEvent.change(textarea, { target: { value: 'Merci de retravailler.' } })

    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }))

    await waitFor(() => {
      expect(mockValidateSubmission).toHaveBeenCalledWith({
        submissionId: SUBMISSION_ID,
        decision: 'revision_requested',
        feedback: 'Merci de retravailler.',
      })
    })
  })

  it('shows error toast when validateSubmission fails', async () => {
    mockValidateSubmission.mockResolvedValue({
      data: null,
      error: { message: 'Erreur validation', code: 'DATABASE_ERROR' },
    })

    render(<ValidateSubmissionForm submissionId={SUBMISSION_ID} clientId={CLIENT_ID} />)

    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur validation')
    })
  })
})
