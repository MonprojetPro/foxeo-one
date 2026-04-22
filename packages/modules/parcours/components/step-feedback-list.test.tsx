import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepFeedbackList } from './step-feedback-list'
import type { StepFeedbackInjection } from '../hooks/use-step-history'

vi.mock('@monprojetpro/utils', () => ({
  formatRelativeDate: vi.fn((d: string) => `il y a X jours (${d})`),
}))

const makeFeedback = (overrides: Partial<StepFeedbackInjection> = {}): StepFeedbackInjection => ({
  id: 'fi-1',
  stepId: 'step-1',
  content: 'Voici mon feedback MiKL pour cette étape',
  readAt: null,
  createdAt: '2026-04-01T10:00:00Z',
  ...overrides,
})

describe('StepFeedbackList', () => {
  it('shows empty state when no feedback', () => {
    render(<StepFeedbackList feedbackInjections={[]} />)
    expect(screen.getByText('Aucun feedback pour le moment')).toBeInTheDocument()
  })

  it('renders feedback content', () => {
    render(<StepFeedbackList feedbackInjections={[makeFeedback()]} />)
    expect(screen.getByText('Voici mon feedback MiKL pour cette étape')).toBeInTheDocument()
  })

  it('shows MiKL label on each feedback', () => {
    render(<StepFeedbackList feedbackInjections={[makeFeedback()]} />)
    expect(screen.getByText('MiKL')).toBeInTheDocument()
  })

  it('shows blue dot for unread feedback (readAt = null)', () => {
    render(<StepFeedbackList feedbackInjections={[makeFeedback({ readAt: null })]} />)
    const dot = screen.getByLabelText('Non lu')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass('bg-blue-400')
  })

  it('does not show blue dot for read feedback', () => {
    render(<StepFeedbackList feedbackInjections={[makeFeedback({ readAt: '2026-04-02T10:00:00Z' })]} />)
    expect(screen.queryByLabelText('Non lu')).not.toBeInTheDocument()
  })

  it('applies orange styling to feedback items', () => {
    const { container } = render(<StepFeedbackList feedbackInjections={[makeFeedback()]} />)
    const li = container.querySelector('li')
    expect(li).toHaveClass('border-[#fb923c]/20')
    expect(li).toHaveClass('bg-[#fb923c]/5')
  })

  it('renders multiple feedbacks', () => {
    render(
      <StepFeedbackList
        feedbackInjections={[
          makeFeedback({ id: 'fi-1', content: 'Feedback A' }),
          makeFeedback({ id: 'fi-2', content: 'Feedback B', readAt: '2026-04-02T10:00:00Z' }),
        ]}
      />
    )
    expect(screen.getByText('Feedback A')).toBeInTheDocument()
    expect(screen.getByText('Feedback B')).toBeInTheDocument()
    // Seul le premier est non-lu
    expect(screen.getAllByLabelText('Non lu')).toHaveLength(1)
  })
})
