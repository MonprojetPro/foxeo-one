import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnalyticsDashboard } from './analytics-dashboard'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../hooks/use-analytics', () => ({
  useAnalytics: vi.fn(),
}))

import { useAnalytics } from '../hooks/use-analytics'

const mockData = {
  overview: {
    labClients: 5,
    oneClients: 3,
    totalClients: 8,
    graduationRate: 38,
    handledRequests: 120,
  },
  modules: [
    { entityType: 'elio', count: 45 },
    { entityType: 'document', count: 30 },
    { entityType: 'parcours', count: 20 },
  ],
  elio: {
    totalConversations: 45,
    positiveFeedback: 30,
    negativeFeedback: 5,
    conversationsPerDay: 6,
  },
  engagement: {
    mostActiveClients: [
      { actorId: 'c1', count: 25 },
      { actorId: 'c2', count: 18 },
    ],
    inactiveClientIds: ['c3'],
    avgLabDurationDays: 0,
  },
  mrr: {
    mrr: 499.0,
    activeSubscriptions: 3,
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le titre du dashboard', () => {
    vi.mocked(useAnalytics).mockReturnValue({ data: mockData, isLoading: false, error: null } as never)

    render(<AnalyticsDashboard />)

    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  it('affiche les 4 boutons de filtre de période', () => {
    vi.mocked(useAnalytics).mockReturnValue({ data: mockData, isLoading: false, error: null } as never)

    render(<AnalyticsDashboard />)

    expect(screen.getByRole('button', { name: '7j' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '30j' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90j' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1an' })).toBeInTheDocument()
  })

  it('clique sur filtre 30j et change la période active', () => {
    vi.mocked(useAnalytics).mockReturnValue({ data: mockData, isLoading: false, error: null } as never)

    render(<AnalyticsDashboard />)

    const btn30j = screen.getByRole('button', { name: '30j' })
    fireEvent.click(btn30j)

    // Button should now have active styling
    expect(btn30j.className).toContain('bg-')
  })

  it('affiche le nombre de clients actifs', () => {
    vi.mocked(useAnalytics).mockReturnValue({ data: mockData, isLoading: false, error: null } as never)

    render(<AnalyticsDashboard />)

    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('affiche le classement des modules', () => {
    vi.mocked(useAnalytics).mockReturnValue({ data: mockData, isLoading: false, error: null } as never)

    render(<AnalyticsDashboard />)

    expect(screen.getByText('elio')).toBeInTheDocument()
    expect(screen.getByText('document')).toBeInTheDocument()
  })

  it('affiche les stats Élio', () => {
    vi.mocked(useAnalytics).mockReturnValue({ data: mockData, isLoading: false, error: null } as never)

    render(<AnalyticsDashboard />)

    expect(screen.getByText('Conversations totales')).toBeInTheDocument()
    expect(screen.getAllByText('45').length).toBeGreaterThan(0)
  })

  it('affiche le taux de graduation', () => {
    vi.mocked(useAnalytics).mockReturnValue({ data: mockData, isLoading: false, error: null } as never)

    render(<AnalyticsDashboard />)

    expect(screen.getByText(/38/)).toBeInTheDocument()
  })

  it('affiche les skeletons en état loading', () => {
    vi.mocked(useAnalytics).mockReturnValue({ data: null, isLoading: true, error: null } as never)

    const { container } = render(<AnalyticsDashboard />)

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
