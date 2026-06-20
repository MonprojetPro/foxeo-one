import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientDetailContent } from './client-detail-content'
import type { Client } from '../types/crm.types'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/modules/crm/clients/123',
}))

// Mock getClient server action (used by useClient hook)
vi.mock('../actions/get-client', () => ({
  getClient: vi.fn().mockResolvedValue({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      operatorId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Jean Dupont',
      company: 'Acme Corp',
      email: 'jean@acme.com',
      clientType: 'complet',
      status: 'active',
      sector: 'tech',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
    },
    error: null,
  }),
}))

// Mock reactivateClient (used by ArchivedBanner)
vi.mock('../actions/reactivate-client', () => ({
  reactivateClient: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}))

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('ClientDetailContent', () => {
  const mockClient: Client = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    operatorId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Jean Dupont',
    company: 'Acme Corp',
    email: 'jean@acme.com',
    clientType: 'complet',
    status: 'active',
    sector: 'tech',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  }

  it('should render client header', () => {
    renderWithQueryClient(<ClientDetailContent client={mockClient} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Jean Dupont' })).toBeInTheDocument()
  })

  it('should render all tabs', () => {
    renderWithQueryClient(<ClientDetailContent client={mockClient} />)

    // La barre d'onglets est rendue en boutons avec aria-label (pas en role="tab").
    // L'onglet « Infos » a été fusionné dans le cockpit Pilote → il n'existe plus.
    expect(screen.getByRole('button', { name: /historique/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /documents/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /échanges/i })).toBeInTheDocument()
  })

  it('should render edit buttons for active client', () => {
    renderWithQueryClient(<ClientDetailContent client={mockClient} />)

    const editButtons = screen.getAllByRole('button', { name: /modifier/i })
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('should render ArchivedBanner for archived client', () => {
    const archivedClient: Client = {
      ...mockClient,
      status: 'archived',
      archivedAt: '2026-02-16T10:00:00.000Z',
    }

    renderWithQueryClient(<ClientDetailContent client={archivedClient} />)

    expect(screen.getByText('Client clôturé')).toBeInTheDocument()
    expect(screen.getByText(/données sont en lecture seule/i)).toBeInTheDocument()
  })

  it('should disable edit buttons for archived client', () => {
    const archivedClient: Client = {
      ...mockClient,
      status: 'archived',
      archivedAt: '2026-02-16T10:00:00.000Z',
    }

    renderWithQueryClient(<ClientDetailContent client={archivedClient} />)

    // Edit buttons should not be present for archived client
    expect(screen.queryByRole('button', { name: /modifier/i })).not.toBeInTheDocument()
  })

  it('should show Réactiver button(s) for archived client', () => {
    const archivedClient: Client = {
      ...mockClient,
      status: 'archived',
      archivedAt: '2026-02-16T10:00:00.000Z',
    }

    renderWithQueryClient(<ClientDetailContent client={archivedClient} />)

    // ArchivedBanner + ClientLifecycleActions both show Réactiver
    const reactivateButtons = screen.getAllByRole('button', { name: /réactiver/i })
    expect(reactivateButtons.length).toBeGreaterThanOrEqual(1)
  })
})
