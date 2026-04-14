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
            description: 'Client cree dans le CRM',
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440011',
            clientId: '550e8400-e29b-41d4-a716-446655440001',
            eventType: 'client_graduated',
            description: 'Graduation vers le dashboard One',
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

  it('should render descriptions', () => {
    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('Client cree dans le CRM')).toBeInTheDocument()
    expect(screen.getByText('Graduation vers le dashboard One')).toBeInTheDocument()
  })

  it('should render navigation shortcuts', () => {
    renderWithQueryClient(<ClientTimeline clientId="550e8400-e29b-41d4-a716-446655440001" />)

    // Both client_created and client_graduated link to 'informations' → "Voir le profil"
    const profileLinks = screen.getAllByText('Voir le profil')
    expect(profileLinks).toHaveLength(2)
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

    // Timeline entries should not be present during loading
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
              description: 'Client cree',
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
})
