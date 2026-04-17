import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParcoursOverview } from './parcours-overview'
import type { ParcoursWithSteps } from '../types/parcours.types'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/modules/parcours',
  useSearchParams: () => new URLSearchParams(),
}))

const mockUseParcours = vi.fn()

vi.mock('../hooks/use-parcours', () => ({
  useParcours: (...args: unknown[]) => mockUseParcours(...args),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    Button: ({ children, onClick, disabled, ...props }: {
      children: React.ReactNode; onClick?: () => void; disabled?: boolean
    } & Record<string, unknown>) =>
      <button onClick={onClick} disabled={disabled} {...props}>{children}</button>,
    Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
  }
})

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

const mockParcours: ParcoursWithSteps = {
  id: '00000000-0000-0000-0000-000000000002',
  clientId: CLIENT_ID,
  templateId: null,
  name: 'Mon Parcours Lab',
  description: 'Votre parcours de création.',
  status: 'in_progress',
  completedAt: null,
  abandonmentReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  steps: [
    {
      id: '00000000-0000-0000-0000-000000000010',
      parcoursId: '00000000-0000-0000-0000-000000000002',
      stepNumber: 1,
      title: 'Étape 1',
      description: 'Description étape 1',
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
      parcoursId: '00000000-0000-0000-0000-000000000002',
      stepNumber: 2,
      title: 'Étape 2',
      description: 'Description étape 2',
      briefTemplate: null,
      briefContent: null,
      briefAssets: [],
      oneTeasingMessage: null,
      status: 'current',
      completedAt: null,
      validationRequired: false,
      validationId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  totalSteps: 2,
  completedSteps: 1,
  progressPercent: 50,
}

describe('ParcoursOverview', () => {
  it('renders skeleton when loading', () => {
    mockUseParcours.mockReturnValue({ data: undefined, isPending: true, error: null })

    const { container } = render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('renders error state when parcours fails to load', () => {
    mockUseParcours.mockReturnValue({
      data: null,
      isPending: false,
      error: new Error('Failed to load'),
    })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.getByText(/impossible de charger votre parcours/i)).toBeDefined()
  })

  it('renders parcours name and description', () => {
    mockUseParcours.mockReturnValue({ data: mockParcours, isPending: false, error: null })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.getByText('Mon Parcours Lab')).toBeDefined()
    expect(screen.getByText('Votre parcours de création.')).toBeDefined()
  })

  it('renders progress information', () => {
    mockUseParcours.mockReturnValue({ data: mockParcours, isPending: false, error: null })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.getByText(/50% complété/i)).toBeDefined()
  })

  it('renders all step titles in grid', () => {
    mockUseParcours.mockReturnValue({ data: mockParcours, isPending: false, error: null })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.getByText('Étape 1')).toBeDefined()
    expect(screen.getByText('Étape 2')).toBeDefined()
  })

  it('calls useParcours with clientId', () => {
    mockUseParcours.mockReturnValue({ data: mockParcours, isPending: false, error: null })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(mockUseParcours).toHaveBeenCalledWith(CLIENT_ID)
  })

  // Story 9.3 — Abandon button
  it('renders abandon button when parcours is in_progress', () => {
    mockUseParcours.mockReturnValue({ data: mockParcours, isPending: false, error: null })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.getByText(/Quitter le parcours/i)).toBeDefined()
  })

  it('renders abandon button when parcours status is en_cours', () => {
    mockUseParcours.mockReturnValue({
      data: { ...mockParcours, status: 'en_cours' },
      isPending: false,
      error: null,
    })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.getByText(/Quitter le parcours/i)).toBeDefined()
  })

  it('does NOT render abandon button when parcours is completed', () => {
    mockUseParcours.mockReturnValue({
      data: { ...mockParcours, status: 'termine' },
      isPending: false,
      error: null,
    })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.queryByText(/Quitter le parcours/i)).toBeNull()
  })

  it('does NOT render abandon button when parcours is abandoned', () => {
    mockUseParcours.mockReturnValue({
      data: { ...mockParcours, status: 'abandoned' },
      isPending: false,
      error: null,
    })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.queryByText(/Quitter le parcours/i)).toBeNull()
  })

  // Story 9.3 — Abandoned state (pause message)
  it('shows pause message when parcours is abandoned', () => {
    mockUseParcours.mockReturnValue({
      data: { ...mockParcours, status: 'abandoned' },
      isPending: false,
      error: null,
    })

    render(<ParcoursOverview clientId={CLIENT_ID} />)
    expect(screen.getByText(/Votre parcours est en pause/)).toBeDefined()
    expect(screen.getByText(/MiKL va vous contacter/)).toBeDefined()
  })
})
