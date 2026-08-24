import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ValidationQueue } from './validation-queue'
import type { ValidationRequest } from '../types/validation.types'

const mockPush = vi.fn()

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock the hooks
vi.mock('../hooks/use-validation-queue', () => ({
  useValidationQueue: vi.fn(),
}))
vi.mock('../hooks/use-validation-realtime', () => ({
  useValidationRealtime: vi.fn(),
}))

const { useValidationQueue } = await import('../hooks/use-validation-queue')
const mockUseValidationQueue = vi.mocked(useValidationQueue)

const mockRequests: ValidationRequest[] = [
  {
    id: 'req-1',
    clientId: 'client-1',
    operatorId: 'op-1',
    parcoursId: null,
    stepId: null,
    type: 'brief_lab',
    title: 'Brief de démarrage',
    content: 'Contenu du brief',
    documentIds: [],
    status: 'pending',
    reviewerComment: null,
    submittedAt: '2026-02-20T10:00:00Z',
    reviewedAt: null,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
    client: {
      id: 'client-1',
      name: 'Jean Dupont',
      company: 'Acme Corp',
      clientType: 'complet',
      avatarUrl: null,
    },
  },
  {
    id: 'req-2',
    clientId: 'client-2',
    operatorId: 'op-1',
    parcoursId: null,
    stepId: null,
    type: 'evolution_one',
    title: 'Évolution module CRM',
    content: 'Description de l\'évolution',
    documentIds: [],
    status: 'approved',
    reviewerComment: null,
    submittedAt: '2026-02-21T10:00:00Z',
    reviewedAt: null,
    createdAt: '2026-02-21T10:00:00Z',
    updatedAt: '2026-02-21T10:00:00Z',
    client: {
      id: 'client-2',
      name: 'Marie Martin',
      company: null,
      clientType: 'direct_one',
      avatarUrl: null,
    },
  },
]

const defaultHookReturn = {
  requests: mockRequests,
  filters: {
    status: 'all' as const,
    type: 'all' as const,
    sortBy: 'submitted_at' as const,
    sortOrder: 'asc' as const,
  },
  setFilters: vi.fn(),
  isLoading: false,
  error: null,
  pendingCount: 1,
}

describe('ValidationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockUseValidationQueue.mockReturnValue(defaultHookReturn)
  })

  it('should render header with title', () => {
    render(<ValidationQueue />)
    expect(screen.getByText('Validation Hub')).toBeInTheDocument()
  })

  it('should display pending count badge when there are pending requests', () => {
    render(<ValidationQueue />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText(/à traiter/)).toBeInTheDocument()
  })

  it('should not display pending badge when pendingCount is 0', () => {
    mockUseValidationQueue.mockReturnValue({ ...defaultHookReturn, pendingCount: 0 })
    render(<ValidationQueue />)
    expect(screen.queryByText(/à traiter/)).not.toBeInTheDocument()
  })

  it('should render client name and company', () => {
    render(<ValidationQueue />)
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Marie Martin')).toBeInTheDocument()
  })

  it('should render request titles', () => {
    render(<ValidationQueue />)
    expect(screen.getByText('Brief de démarrage')).toBeInTheDocument()
    expect(screen.getByText('Évolution module CRM')).toBeInTheDocument()
  })

  it('should render type badges', () => {
    render(<ValidationQueue />)
    // May appear in both select options and badges
    expect(screen.getAllByText('Brief Lab').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Évolution One').length).toBeGreaterThan(0)
  })

  it('should render status badges', () => {
    render(<ValidationQueue />)
    // May appear in both select options and badges
    expect(screen.getAllByText('En attente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Approuvé').length).toBeGreaterThan(0)
  })

  // Les filtres sont rendus en pills cliquables (design system cockpit) et non
  // plus en listes deroulantes etiquetees.
  it('should render filter controls', () => {
    render(<ValidationQueue />)
    expect(screen.getByRole('button', { name: 'En attente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brief Lab' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Plus récente/ })).toBeInTheDocument()
  })

  it('should call setFilters when status filter changes', () => {
    render(<ValidationQueue />)
    fireEvent.click(screen.getByRole('button', { name: 'En attente' }))
    expect(defaultHookReturn.setFilters).toHaveBeenCalledWith({ status: 'pending' })
  })

  it('should call setFilters when type filter changes', () => {
    render(<ValidationQueue />)
    fireEvent.click(screen.getByRole('button', { name: 'Brief Lab' }))
    expect(defaultHookReturn.setFilters).toHaveBeenCalledWith({ type: 'brief_lab' })
  })

  it('should render empty state when no requests', () => {
    mockUseValidationQueue.mockReturnValue({
      ...defaultHookReturn,
      requests: [],
      pendingCount: 0,
    })
    render(<ValidationQueue />)
    expect(
      screen.getByText('Aucune demande en attente — tout est à jour !')
    ).toBeInTheDocument()
  })

  it('should show skeleton loaders when loading', () => {
    mockUseValidationQueue.mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
      requests: [],
    })
    render(<ValidationQueue />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should show error message when error occurs', () => {
    mockUseValidationQueue.mockReturnValue({
      ...defaultHookReturn,
      error: new Error('Erreur de connexion'),
      requests: [],
    })
    render(<ValidationQueue />)
    expect(screen.getByText('Erreur de chargement')).toBeInTheDocument()
    expect(screen.getByText('Erreur de connexion')).toBeInTheDocument()
  })

  it('should navigate to detail page when card is clicked', () => {
    render(<ValidationQueue />)
    const card = screen.getByText('Brief de démarrage').closest('[role="button"]')
    card?.click()
    expect(mockPush).toHaveBeenCalledWith('/modules/validation-hub/req-1')
  })

  it('should show "Reportée" badge when request is postponed', () => {
    const postponedRequest: ValidationRequest = {
      ...mockRequests[0],
      id: 'req-postponed',
      status: 'pending',
      reviewerComment: 'Reporté : Pas le moment',
    }
    mockUseValidationQueue.mockReturnValue({
      ...defaultHookReturn,
      requests: [postponedRequest],
    })
    render(<ValidationQueue />)
    expect(screen.getByText('Reportée')).toBeInTheDocument()
  })

  it('should NOT show "Reportée" badge for pending requests without postpone comment', () => {
    render(<ValidationQueue />)
    // req-1 is pending but reviewerComment is null
    expect(screen.queryByText('Reportée')).not.toBeInTheDocument()
  })

  it('should show "Reportée" badge when reviewerComment starts with "Reporté" without reason', () => {
    const postponedRequest: ValidationRequest = {
      ...mockRequests[0],
      id: 'req-postponed-2',
      status: 'pending',
      reviewerComment: 'Reporté',
    }
    mockUseValidationQueue.mockReturnValue({
      ...defaultHookReturn,
      requests: [postponedRequest],
    })
    render(<ValidationQueue />)
    expect(screen.getByText('Reportée')).toBeInTheDocument()
  })

  it('should sort pending requests first', () => {
    // req-1 is pending (should be first), req-2 is approved (second)
    render(<ValidationQueue />)
    const cards = document.querySelectorAll('[role="button"]')
    expect(cards.length).toBe(2)
    // First card should contain pending request info
    expect(cards[0].textContent).toContain('Jean Dupont')
  })
})
