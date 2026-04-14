import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientInfoTab } from './client-info-tab'

// Mock @monprojetpro/module-admin
vi.mock('@monprojetpro/module-admin', () => ({
  exportClientData: vi.fn().mockResolvedValue({ data: { exportId: 'export-123' }, error: null }),
  transferInstanceToClient: vi.fn().mockResolvedValue({ data: { transferId: 'transfer-123' }, error: null }),
}))

// Mock useClientInstance hook
vi.mock('../hooks/use-client-instance', () => ({
  useClientInstance: vi.fn().mockReturnValue({ data: { id: 'instance-123', status: 'active' }, isPending: false }),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/modules/crm/clients/123',
}))

// Mock useClient hook
vi.mock('../hooks/use-client', () => ({
  useClient: vi.fn().mockReturnValue({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      operatorId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Jean Dupont',
      company: 'Acme Corp',
      email: 'jean@acme.com',
      clientType: 'complet',
      status: 'lab-actif',
      sector: 'tech',
      phone: '+33612345678',
      website: 'https://acme.com',
      notes: 'Notes de test',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      config: {
        activeModules: ['core-dashboard', 'chat'],
        dashboardType: 'one',
        themeVariant: null,
      },
    },
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

describe('ClientInfoTab', () => {
  it('should render contact information', () => {
    renderWithQueryClient(<ClientInfoTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('jean@acme.com')).toBeInTheDocument()
    expect(screen.getByText('+33612345678')).toBeInTheDocument()
  })

  it('should render configuration section with badges', () => {
    renderWithQueryClient(<ClientInfoTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('Complet')).toBeInTheDocument()
    expect(screen.getByText('Lab actif')).toBeInTheDocument()
  })

  it('should render edit button when onEdit prop is provided', () => {
    const onEdit = vi.fn()
    renderWithQueryClient(<ClientInfoTab clientId="550e8400-e29b-41d4-a716-446655440001" onEdit={onEdit} />)

    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument()
  })

  it('should not render edit button without onEdit prop', () => {
    renderWithQueryClient(<ClientInfoTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument()
  })

  it('should render active modules when config exists', () => {
    renderWithQueryClient(<ClientInfoTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    expect(screen.getByText('core-dashboard')).toBeInTheDocument()
    expect(screen.getByText('chat')).toBeInTheDocument()
  })

  it('should not render contact info when pending', async () => {
    const { useClient } = await import('../hooks/use-client')
    vi.mocked(useClient).mockReturnValueOnce({
      data: undefined,
      isPending: true,
      error: null,
    } as ReturnType<typeof useClient>)

    renderWithQueryClient(<ClientInfoTab clientId="550e8400-e29b-41d4-a716-446655440001" />)

    // Contact info should not be present during loading
    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument()
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })
})
