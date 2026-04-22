import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParcoursStepDetail } from './parcours-step-detail'
import type { ParcoursStep } from '../types/parcours.types'

vi.mock('./step-elio-chat', () => ({
  StepElioChat: () => <div data-testid="step-elio-chat">StepElioChat</div>,
}))
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}))
vi.mock('remark-gfm', () => ({ default: () => {} }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))
vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, disabled, variant, size, ...props }: { children: React.ReactNode; disabled?: boolean; variant?: string; size?: string; [key: string]: unknown }) => (
    <button disabled={disabled} data-variant={variant} data-size={size} {...props}>{children}</button>
  ),
}))

const baseStep: ParcoursStep = {
  id: '00000000-0000-0000-0000-000000000010',
  parcoursId: '00000000-0000-0000-0000-000000000001',
  stepNumber: 2,
  title: 'Valider mon concept',
  description: 'Décrivez et validez votre concept auprès de MiKL.',
  briefTemplate: null,
  briefContent: '## Mon brief\n\nContenu markdown.',
  briefAssets: [],
  oneTeasingMessage: 'Dans One, cela sera automatisé.',
  status: 'current',
  completedAt: null,
  validationRequired: true,
  validationId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('ParcoursStepDetail', () => {
  it('renders breadcrumb with step title', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText(/Mon Parcours/)).toBeDefined()
    expect(screen.getByText(/Étape 2 : Valider mon concept/)).toBeDefined()
  })

  it('renders step title and number', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('02')).toBeDefined()
    expect(screen.getByText('Valider mon concept')).toBeDefined()
  })

  it('renders "Pourquoi cette étape ?" section', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('Pourquoi cette étape ?')).toBeDefined()
  })

  it('renders brief content with markdown renderer', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('Votre brief')).toBeDefined()
    expect(screen.getByTestId('markdown-content')).toBeDefined()
  })

  it('renders teasing MonprojetPro One card', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('Aperçu MonprojetPro One')).toBeDefined()
    expect(screen.getByText('Dans One, cela sera automatisé.')).toBeDefined()
  })

  it('hides teasing card when no message', () => {
    const stepNoTeasing = { ...baseStep, oneTeasingMessage: null }
    render(<ParcoursStepDetail step={stepNoTeasing} totalSteps={5} />)
    expect(screen.queryByText('Aperçu MonprojetPro One')).toBeNull()
  })

  it('renders CTA "Commencer cette étape" for current step', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('Commencer cette étape')).toBeDefined()
  })

  it('renders CTA "Étape verrouillée" disabled for locked step', () => {
    const locked = { ...baseStep, status: 'locked' as const }
    render(<ParcoursStepDetail step={locked} totalSteps={5} />)
    expect(screen.getByText('Étape verrouillée')).toBeDefined()
  })

  it('renders CTA "Voir ma soumission" for completed step', () => {
    const completed = { ...baseStep, status: 'completed' as const }
    render(<ParcoursStepDetail step={completed} totalSteps={5} />)
    expect(screen.getByText('Voir ma soumission')).toBeDefined()
  })

  it('falls back to briefTemplate when briefContent is null', () => {
    const stepNoContent = { ...baseStep, briefContent: null, briefTemplate: 'Template texte' }
    render(<ParcoursStepDetail step={stepNoContent} totalSteps={5} />)
    expect(screen.getByText('Template texte')).toBeDefined()
  })

  it('renders status badge', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('En cours')).toBeDefined()
  })
})
