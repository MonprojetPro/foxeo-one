import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepSubmissionsList } from './step-submissions-list'
import type { StepSubmission } from '../types/parcours.types'

vi.mock('@monprojetpro/utils', () => ({
  formatRelativeDate: vi.fn((d: string) => `il y a X jours (${d})`),
}))

vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  showSuccess: vi.fn(),
  showError: vi.fn(),
}))

const makeSubmission = (overrides: Partial<StepSubmission> = {}): StepSubmission => ({
  id: 'sub-1',
  parcoursStepId: 'step-1',
  clientId: 'client-1',
  submissionContent: 'Contenu de ma soumission pour cette étape du parcours',
  submissionFiles: [],
  submittedAt: '2026-04-01T10:00:00Z',
  status: 'pending',
  feedback: null,
  feedbackAt: null,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z',
  ...overrides,
})

describe('StepSubmissionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no submissions', () => {
    render(<StepSubmissionsList submissions={[]} />)
    expect(screen.getByText('Aucune soumission pour cette étape')).toBeInTheDocument()
  })

  it('renders submission with pending badge (yellow)', () => {
    render(<StepSubmissionsList submissions={[makeSubmission({ status: 'pending' })]} />)
    expect(screen.getByText('En attente')).toBeInTheDocument()
  })

  it('renders submission with approved badge (green)', () => {
    render(<StepSubmissionsList submissions={[makeSubmission({ status: 'approved' })]} />)
    expect(screen.getByText('Approuvé')).toBeInTheDocument()
  })

  it('renders submission with rejected badge (red)', () => {
    render(<StepSubmissionsList submissions={[makeSubmission({ status: 'rejected' })]} />)
    expect(screen.getByText('Refusé')).toBeInTheDocument()
  })

  it('renders submission with revision_requested badge (orange)', () => {
    render(<StepSubmissionsList submissions={[makeSubmission({ status: 'revision_requested' })]} />)
    expect(screen.getByText('Révision')).toBeInTheDocument()
  })

  it('truncates content preview to 50 chars', () => {
    const longContent = 'A'.repeat(100)
    render(<StepSubmissionsList submissions={[makeSubmission({ submissionContent: longContent })]} />)
    const preview = screen.getByText(/A{50}…/)
    expect(preview).toBeInTheDocument()
  })

  it('does not add ellipsis when content is 50 chars or less', () => {
    const shortContent = 'A'.repeat(30)
    render(<StepSubmissionsList submissions={[makeSubmission({ submissionContent: shortContent })]} />)
    // No ellipsis
    expect(screen.queryByText(/…/)).not.toBeInTheDocument()
  })

  it('shows relative date', () => {
    render(<StepSubmissionsList submissions={[makeSubmission()]} />)
    expect(screen.getByText(/il y a X jours/)).toBeInTheDocument()
  })

  it('clicking a submission opens the modal', () => {
    render(<StepSubmissionsList submissions={[makeSubmission()]} />)
    const button = screen.getByRole('button', { name: /En attente/i })
    fireEvent.click(button)
    // Modal should show full content
    expect(screen.getByText('Contenu de la soumission')).toBeInTheDocument()
  })
})
