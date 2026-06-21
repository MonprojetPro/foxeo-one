import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientTimeline } from './client-timeline'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/modules/crm/clients/123',
}))

// Mock useClientActivityLogs hook
vi.mock('../hooks/use-client-activity-logs', () => ({
  useClientActivityLogs: vi.fn().mockReturnValue({
    data: {
      pages: [
        [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            clientId: '550e8400-e29b-41d4-a716-446655440001',
            eventType: 'client_created',
            description: 'Client créé',
            actorType: 'operator',
            actorLabel: 'par toi',
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440011',
            clientId: '550e8400-e29b-41d4-a716-446655440001',
            eventType: 'client_graduated',
            description: 'Graduation vers One',
            actorType: 'operator',
            actorLabel: 'par toi',
            createdAt: '2024-01-16T14:00:00Z',
          },
        ],
      ],
      pageParams: [0],
    },
    isPending: false,
    error: null,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
}))

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('ClientTimeline', () => {
  it('should render activity log entries', () => {
    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('Client créé')).toBeInTheDocument()
    expect(screen.getByText('Graduation vers One')).toBeInTheDocument()
  })

  it('should display actor labels', () => {
    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    // Les deux entrées ont actorLabel 'par toi'
    const actorLabels = screen.getAllByText('par toi')
    expect(actorLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('should render navigation shortcuts pointing to pilote tab', () => {
    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    // client_created et client_graduated pointent vers 'pilote' → "Voir le cockpit"
    const cockpitLinks = screen.getAllByText('Voir le cockpit')
    expect(cockpitLinks).toHaveLength(2)
  })

  it('should render empty state when no logs', async () => {
    const { useClientActivityLogs } = await import('../hooks/use-client-activity-logs')
    vi.mocked(useClientActivityLogs).mockReturnValueOnce({
      data: { pages: [[]], pageParams: [0] },
      isPending: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useClientActivityLogs>)

    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText(/aucune activit/i)).toBeInTheDocument()
  })

  it('should not render timeline entries when pending', async () => {
    const { useClientActivityLogs } = await import('../hooks/use-client-activity-logs')
    vi.mocked(useClientActivityLogs).mockReturnValueOnce({
      data: undefined,
      isPending: true,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useClientActivityLogs>)

    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.queryByText('Client créé')).not.toBeInTheDocument()
    expect(screen.queryByText('Graduation vers One')).not.toBeInTheDocument()
  })

  it('should show load more button when hasNextPage is true', async () => {
    const { useClientActivityLogs } = await import('../hooks/use-client-activity-logs')
    vi.mocked(useClientActivityLogs).mockReturnValueOnce({
      data: {
        pages: [
          [
            {
              id: '550e8400-e29b-41d4-a716-446655440010',
              clientId: '550e8400-e29b-41d4-a716-446655440001',
              eventType: 'client_created',
              description: 'Client créé',
              actorType: 'operator',
              actorLabel: 'par toi',
              createdAt: '2024-01-15T10:00:00Z',
            },
          ],
        ],
        pageParams: [0],
      },
      isPending: false,
      error: null,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useClientActivityLogs>)

    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByRole('button', { name: /charger plus/i })).toBeInTheDocument()
  })

  it('should render dynamic parcours_mode_set actions with readable label', async () => {
    const { useClientActivityLogs } = await import('../hooks/use-client-activity-logs')
    vi.mocked(useClientActivityLogs).mockReturnValueOnce({
      data: {
        pages: [
          [
            {
              id: '550e8400-e29b-41d4-a716-446655440020',
              clientId: '550e8400-e29b-41d4-a716-446655440001',
              eventType: 'parcours_mode_set_libre',
              description: 'Basculé en mode libre — 2 étape(s) resynchronisée(s)',
              actorType: 'operator',
              actorLabel: 'par toi',
              createdAt: '2024-02-01T09:00:00Z',
            },
          ],
        ],
        pageParams: [0],
      },
      isPending: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useClientActivityLogs>)

    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('Mode de parcours → Libre')).toBeInTheDocument()
    // Ne doit plus afficher le code brut
    expect(screen.queryByText('parcours_mode_set_libre')).not.toBeInTheDocument()
  })

  it('should render access toggle actions with readable label', async () => {
    const { useClientActivityLogs } = await import('../hooks/use-client-activity-logs')
    vi.mocked(useClientActivityLogs).mockReturnValueOnce({
      data: {
        pages: [
          [
            {
              id: '550e8400-e29b-41d4-a716-446655440021',
              clientId: '550e8400-e29b-41d4-a716-446655440001',
              eventType: 'access_lab_enabled',
              description: 'Accès Lab (agents Élio) activé',
              actorType: 'operator',
              actorLabel: 'par toi',
              createdAt: '2024-02-02T10:00:00Z',
            },
          ],
        ],
        pageParams: [0],
      },
      isPending: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useClientActivityLogs>)

    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('Accès Lab (agents Élio) activé')).toBeInTheDocument()
    expect(screen.queryByText('access_lab_enabled')).not.toBeInTheDocument()
  })

  it('should render submission events with readable label', async () => {
    const { useClientActivityLogs } = await import('../hooks/use-client-activity-logs')
    vi.mocked(useClientActivityLogs).mockReturnValueOnce({
      data: {
        pages: [
          [
            {
              id: '550e8400-e29b-41d4-a716-446655440022',
              clientId: '550e8400-e29b-41d4-a716-446655440001',
              eventType: 'submission_approved',
              description: 'Étape validée : Identité de marque',
              actorType: 'operator',
              actorLabel: 'par toi',
              createdAt: '2024-02-03T11:00:00Z',
            },
          ],
        ],
        pageParams: [0],
      },
      isPending: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useClientActivityLogs>)

    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('Soumission approuvée')).toBeInTheDocument()
    expect(screen.getByText('Voir les soumissions')).toBeInTheDocument()
  })

  it('should render client actor label differently', async () => {
    const { useClientActivityLogs } = await import('../hooks/use-client-activity-logs')
    vi.mocked(useClientActivityLogs).mockReturnValueOnce({
      data: {
        pages: [
          [
            {
              id: '550e8400-e29b-41d4-a716-446655440023',
              clientId: '550e8400-e29b-41d4-a716-446655440001',
              eventType: 'submission_sent',
              description: 'Le client a soumis son travail pour validation',
              actorType: 'client',
              actorLabel: 'par le client',
              createdAt: '2024-02-04T14:00:00Z',
            },
          ],
        ],
        pageParams: [0],
      },
      isPending: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useClientActivityLogs>)

    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('Soumission envoyée par le client')).toBeInTheDocument()
    expect(screen.getByText('par le client')).toBeInTheDocument()
  })
})
