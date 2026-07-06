import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { CoachingCreditsInfo } from '../actions/coaching-credits'
import { CoachingCreditsPanel } from './coaching-credits-panel'

const mockGetInfo = vi.fn()

vi.mock('../actions/coaching-credits', () => ({
  getCoachingCreditsInfo: (clientId: string) => mockGetInfo(clientId),
  setCoachingMonthlyCredits: vi.fn(),
  addCoachingCredits: vi.fn(),
}))

// Realtime : canal factice (pas de connexion dans les tests unitaires)
vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: () => {
    const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) }
    return {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    }
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440001'

function infoResponse(overrides: Partial<CoachingCreditsInfo> = {}) {
  return {
    data: {
      balance: 3,
      monthlyCredits: 1,
      elioTier: 'one_plus' as const,
      recentLedger: [
        {
          id: 'l1',
          delta: -1,
          reason: 'session_booked' as const,
          meetingId: 'm1',
          note: null,
          createdBy: 'calcom-webhook',
          createdAt: '2026-07-01T10:00:00Z',
        },
      ],
      ...overrides,
    },
    error: null,
  }
}

describe('CoachingCreditsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('se masque pour un client non One+ (elio_tier=one)', async () => {
    mockGetInfo.mockResolvedValue(infoResponse({ elioTier: 'one' }))

    const { container } = render(<CoachingCreditsPanel clientId={CLIENT_ID} />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.queryByTestId('coaching-credits-skeleton')).not.toBeInTheDocument()
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche solde, crédits/mois et historique pour un client One+', async () => {
    mockGetInfo.mockResolvedValue(infoResponse())

    render(<CoachingCreditsPanel clientId={CLIENT_ID} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByTestId('coaching-credits-panel')).toBeInTheDocument()
    })
    expect(screen.getByText('Coaching One+')).toBeInTheDocument()
    expect(screen.getByTestId('coaching-balance')).toHaveTextContent('3 séances')
    expect(screen.getByTestId('coaching-monthly-input')).toHaveValue(1)
    expect(screen.getByText('Séance réservée')).toBeInTheDocument()
    expect(screen.getByText('-1')).toBeInTheDocument()
    expect(screen.getByTestId('coaching-add-credits-button')).toBeInTheDocument()
  })

  it('affiche l\'état vide de l\'historique', async () => {
    mockGetInfo.mockResolvedValue(infoResponse({ recentLedger: [] }))

    render(<CoachingCreditsPanel clientId={CLIENT_ID} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Aucun mouvement pour l'instant/)).toBeInTheDocument()
    })
  })
})
