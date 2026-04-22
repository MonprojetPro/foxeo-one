import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StepDocumentsList } from './step-documents-list'
import type { StepSubmission } from '../types/parcours.types'

vi.mock('@monprojetpro/utils', () => ({
  formatRelativeDate: vi.fn((d: string) => `il y a X jours (${d})`),
}))

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()
vi.mock('@monprojetpro/ui', () => ({
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  showError: (...args: unknown[]) => mockShowError(...args),
}))

const makeSubmission = (overrides: Partial<StepSubmission> = {}): StepSubmission => ({
  id: 'sub-1',
  parcoursStepId: 'step-1',
  clientId: 'client-1',
  submissionContent: 'Contenu markdown de ma soumission',
  submissionFiles: [],
  submittedAt: '2026-04-01T10:00:00Z',
  status: 'approved',
  feedback: null,
  feedbackAt: null,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z',
  ...overrides,
})

describe('StepDocumentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no submissions', () => {
    render(<StepDocumentsList submissions={[]} />)
    expect(screen.getByText('Aucun document généré pour cette étape')).toBeInTheDocument()
  })

  it('renders document title and date', () => {
    render(<StepDocumentsList submissions={[makeSubmission()]} />)
    expect(screen.getByText(/Document —/)).toBeInTheDocument()
    expect(screen.getByText(/il y a X jours/)).toBeInTheDocument()
  })

  it('copies content to clipboard on button click', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })

    render(<StepDocumentsList submissions={[makeSubmission()]} />)

    const copyButton = screen.getByLabelText('Copier le contenu du document')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('Contenu markdown de ma soumission')
    })

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('Document copié dans le presse-papier')
    })
  })

  it('shows error toast when clipboard fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
      writable: true,
      configurable: true,
    })

    render(<StepDocumentsList submissions={[makeSubmission()]} />)

    const copyButton = screen.getByLabelText('Copier le contenu du document')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('permissions'))
    })
  })
})
