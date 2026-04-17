import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParcoursTimeline } from './parcours-timeline'
import type { ParcoursStep } from '../types/parcours.types'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/modules/parcours',
  useSearchParams: () => new URLSearchParams(),
}))

const mockSteps: ParcoursStep[] = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    parcoursId: '00000000-0000-0000-0000-000000000001',
    stepNumber: 1,
    title: 'Étape 1 — Idée',
    description: 'Définissez votre idée principale.',
    briefTemplate: null,
    briefContent: null,
    briefAssets: [],
    oneTeasingMessage: null,
    status: 'completed',
    completedAt: '2026-01-15T00:00:00.000Z',
    validationRequired: true,
    validationId: '00000000-0000-0000-0000-000000000099',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    parcoursId: '00000000-0000-0000-0000-000000000001',
    stepNumber: 2,
    title: 'Étape 2 — Validation',
    description: 'Validez votre concept.',
    briefTemplate: 'Mon idée est...',
    briefContent: '## Brief\n\nContenu.',
    briefAssets: [],
    oneTeasingMessage: null,
    status: 'current',
    completedAt: null,
    validationRequired: true,
    validationId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    parcoursId: '00000000-0000-0000-0000-000000000001',
    stepNumber: 3,
    title: 'Étape 3 — Lancement',
    description: 'Lancez votre projet.',
    briefTemplate: null,
    briefContent: null,
    briefAssets: [],
    oneTeasingMessage: null,
    status: 'locked',
    completedAt: null,
    validationRequired: false,
    validationId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('ParcoursTimeline', () => {
  it('renders empty state when no steps provided', () => {
    render(<ParcoursTimeline steps={[]} />)
    expect(screen.getByText(/aucune étape/i)).toBeDefined()
  })

  it('renders all step titles', () => {
    render(<ParcoursTimeline steps={mockSteps} />)
    const headings = screen.getAllByRole('heading')
    const texts = headings.map((h) => h.textContent ?? '')
    expect(texts.some((t) => t.includes('Idée'))).toBe(true)
    expect(texts.some((t) => t.includes('Validation'))).toBe(true)
    expect(texts.some((t) => t.includes('Lancement'))).toBe(true)
  })

  it('renders step descriptions', () => {
    render(<ParcoursTimeline steps={mockSteps} />)
    expect(screen.getByText('Définissez votre idée principale.')).toBeDefined()
  })

  it('renders status badges for each step', () => {
    render(<ParcoursTimeline steps={mockSteps} />)
    expect(screen.getByText('Validée')).toBeDefined()
    expect(screen.getByText('En cours')).toBeDefined()
    expect(screen.getByText('Verrouillée')).toBeDefined()
  })
})

describe('ParcoursStepStatusBadge', () => {
  it('renders correct label for each status', async () => {
    const { ParcoursStepStatusBadge } = await import('./parcours-step-status-badge')

    const { unmount: u1 } = render(<ParcoursStepStatusBadge status="locked" />)
    expect(screen.getByText('Verrouillée')).toBeDefined()
    u1()

    const { unmount: u2 } = render(<ParcoursStepStatusBadge status="current" />)
    expect(screen.getByText('En cours')).toBeDefined()
    u2()

    const { unmount: u3 } = render(<ParcoursStepStatusBadge status="completed" />)
    expect(screen.getByText('Validée')).toBeDefined()
    u3()

    const { unmount: u4 } = render(<ParcoursStepStatusBadge status="skipped" />)
    expect(screen.getByText('Passée')).toBeDefined()
    u4()
  })
})
