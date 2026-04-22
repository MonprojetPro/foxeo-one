import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepHistoryPanel } from './step-history-panel'

vi.mock('../hooks/use-step-history', () => ({
  useStepHistory: vi.fn(),
}))

vi.mock('@monprojetpro/utils', () => ({
  formatRelativeDate: vi.fn((d: string) => `il y a quelques jours (${d})`),
}))

vi.mock('@monprojetpro/ui', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}))

import { useStepHistory } from '../hooks/use-step-history'

describe('StepHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the 3 sections', () => {
    vi.mocked(useStepHistory).mockReturnValue({
      submissions: [],
      feedbackInjections: [],
      isLoadingSubmissions: false,
      isLoadingFeedback: false,
    })

    render(<StepHistoryPanel stepId="step-1" stepNumber={1} />)

    expect(screen.getByText('Soumissions')).toBeInTheDocument()
    expect(screen.getByText('Documents générés')).toBeInTheDocument()
    expect(screen.getByText('Feedback MiKL')).toBeInTheDocument()
  })

  it('displays the step number in the header', () => {
    vi.mocked(useStepHistory).mockReturnValue({
      submissions: [],
      feedbackInjections: [],
      isLoadingSubmissions: false,
      isLoadingFeedback: false,
    })

    render(<StepHistoryPanel stepId="step-3" stepNumber={3} />)

    expect(screen.getByText('Historique — Étape 3')).toBeInTheDocument()
  })

  it('shows loading skeletons when loading submissions', () => {
    vi.mocked(useStepHistory).mockReturnValue({
      submissions: [],
      feedbackInjections: [],
      isLoadingSubmissions: true,
      isLoadingFeedback: false,
    })

    const { container } = render(<StepHistoryPanel stepId="step-1" stepNumber={1} />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows unread badge when there are unread feedbacks', () => {
    vi.mocked(useStepHistory).mockReturnValue({
      submissions: [],
      feedbackInjections: [
        { id: 'fi-1', stepId: 'step-1', content: 'Feedback', readAt: null, createdAt: '2026-04-01T10:00:00Z' },
        { id: 'fi-2', stepId: 'step-1', content: 'Feedback 2', readAt: '2026-04-02T10:00:00Z', createdAt: '2026-04-02T10:00:00Z' },
      ],
      isLoadingSubmissions: false,
      isLoadingFeedback: false,
    })

    render(<StepHistoryPanel stepId="step-1" stepNumber={2} />)

    // 1 unread
    const badge = screen.getByText('1')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-500')
  })
})
