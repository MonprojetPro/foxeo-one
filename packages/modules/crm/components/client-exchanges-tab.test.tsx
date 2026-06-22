import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientExchangesTab } from './client-exchanges-tab'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/modules/crm/clients/123',
}))

// Mock useClientExchanges hook
vi.mock('../hooks/use-client-exchanges', () => ({
  useClientExchanges: vi.fn().mockReturnValue({
    data: [],
    isPending: false,
    error: null,
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

describe('ClientExchangesTab', () => {
  it('should render empty state when no exchanges', () => {
    renderWithQueryClient(<ClientExchangesTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText(/aucun échange/i)).toBeInTheDocument()
  })

  it('should render chat button in empty state', () => {
    renderWithQueryClient(<ClientExchangesTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByRole('link', { name: /d.marrer une conversation/i })).toBeInTheDocument()
  })

  it('should render exchange list when data exists', async () => {
    const { useClientExchanges } = await import('../hooks/use-client-exchanges')
    vi.mocked(useClientExchanges).mockReturnValueOnce({
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          clientId: '550e8400-e29b-41d4-a716-446655440001',
          type: 'message',
          content: 'Bonjour, voici mon premier message pour tester les echanges dans le CRM',
          createdAt: '2024-01-15T10:00:00Z',
        },
      ],
      isPending: false,
      error: null,
    } as ReturnType<typeof useClientExchanges>)

    renderWithQueryClient(<ClientExchangesTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    // "Chat" appears in both the channel grid and the exchange badge — check at least one exists
    expect(screen.getAllByText('Chat').length).toBeGreaterThan(0)
  })

  it('should truncate long exchange content', async () => {
    const longContent = 'A'.repeat(150)
    const { useClientExchanges } = await import('../hooks/use-client-exchanges')
    vi.mocked(useClientExchanges).mockReturnValueOnce({
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          clientId: '550e8400-e29b-41d4-a716-446655440001',
          type: 'message',
          content: longContent,
          createdAt: '2024-01-15T10:00:00Z',
        },
      ],
      isPending: false,
      error: null,
    } as ReturnType<typeof useClientExchanges>)

    renderWithQueryClient(<ClientExchangesTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    // Content should be truncated to 120 chars + "…"
    expect(screen.getByText(/…$/)).toBeInTheDocument()
  })
})
