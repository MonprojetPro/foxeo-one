import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientList } from './client-list'
import type { ClientListItem } from '../types/crm.types'

// Mock dependencies required by CreateClientDialog
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQuery: () => ({ data: [], isLoading: false }),
}))
vi.mock('../actions/create-client', () => ({
  createClient: vi.fn().mockResolvedValue({ data: null, error: null }),
}))
vi.mock('../actions/import-clients-csv', () => ({
  importClientsCsv: vi.fn().mockResolvedValue({ data: null, error: null }),
}))
vi.mock('../actions/reactivate-client', () => ({
  reactivateClient: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}))
vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})

describe('ClientList', () => {
  const mockClients: ClientListItem[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'John Doe',
      company: 'Acme Corp',
      clientType: 'complet',
      status: 'active',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Jane Smith',
      company: 'Tech Inc',
      clientType: 'direct_one',
      status: 'suspended',
      createdAt: '2024-02-20T14:30:00Z'
    }
  ]

  it('should render client list with data', () => {
    render(<ClientList clients={mockClients} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Tech Inc')).toBeInTheDocument()
  })

  it('should render column headers', () => {
    render(<ClientList clients={mockClients} />)

    expect(screen.getByText('Nom')).toBeInTheDocument()
    expect(screen.getByText('Entreprise')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Statut')).toBeInTheDocument()
    expect(screen.getByText('Créé le')).toBeInTheDocument()
  })

  it('should render client type badges', () => {
    render(<ClientList clients={mockClients} />)

    expect(screen.getByText('Complet')).toBeInTheDocument()
    expect(screen.getByText('Direct One')).toBeInTheDocument()
  })

  it('should render status badges', () => {
    render(<ClientList clients={mockClients} />)

    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.getByText('Suspendu')).toBeInTheDocument()
  })

  it('should format dates correctly', () => {
    render(<ClientList clients={mockClients} />)

    // Check that dates are formatted (not exact format, just that they're rendered)
    expect(screen.getByText(/15\/01\/2024|2024-01-15/i)).toBeInTheDocument()
    expect(screen.getByText(/20\/02\/2024|2024-02-20/i)).toBeInTheDocument()
  })

  it('should call onRowClick when row is clicked', () => {
    const handleRowClick = vi.fn()
    render(<ClientList clients={mockClients} onRowClick={handleRowClick} />)

    const row = screen.getByText('John Doe').closest('tr')
    row?.click()

    expect(handleRowClick).toHaveBeenCalledWith(mockClients[0])
  })

  it('should render empty state when no clients', () => {
    render(<ClientList clients={[]} />)

    expect(screen.getByText(/aucun client/i)).toBeInTheDocument()
  })

  // Story 9.5c — Archived client tests
  describe('Archived clients (Story 9.5c)', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const pastDate = new Date(Date.now() - 1000).toISOString()

    const archivedClient: ClientListItem = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Marie Martin',
      company: 'Archive Corp',
      clientType: 'complet',
      status: 'archived',
      createdAt: '2024-01-01T00:00:00Z',
      archivedAt: '2025-01-01T00:00:00Z',
      retentionUntil: futureDate,
    }

    it('should render the Archivé status text for an archived client', () => {
      render(<ClientList clients={[archivedClient]} />)

      expect(screen.getByText('Archivé')).toBeInTheDocument()
    })

    it('should show retention date for archived client', () => {
      render(<ClientList clients={[archivedClient]} />)

      expect(screen.getByTestId(`retention-until-${archivedClient.id}`)).toBeInTheDocument()
    })

    it('should show Réactiver button for archived client within retention period', () => {
      render(<ClientList clients={[archivedClient]} />)

      expect(screen.getByTestId(`reactivate-button-${archivedClient.id}`)).toBeInTheDocument()
    })

    it('should NOT show Réactiver button when retention period expired', () => {
      const expiredClient: ClientListItem = {
        ...archivedClient,
        id: '550e8400-e29b-41d4-a716-446655440003',
        retentionUntil: pastDate,
      }

      render(<ClientList clients={[expiredClient]} />)

      expect(screen.queryByTestId(`reactivate-button-${expiredClient.id}`)).not.toBeInTheDocument()
    })

    it('should show Réactiver button when retention_until is null (legacy archived)', () => {
      const legacyClient: ClientListItem = {
        ...archivedClient,
        id: '550e8400-e29b-41d4-a716-446655440004',
        retentionUntil: null,
      }

      render(<ClientList clients={[legacyClient]} />)

      expect(screen.getByTestId(`reactivate-button-${legacyClient.id}`)).toBeInTheDocument()
    })

    it('should NOT show archived badge for active clients', () => {
      render(<ClientList clients={mockClients} />)

      expect(screen.queryByTestId(`archived-badge-${mockClients[0].id}`)).not.toBeInTheDocument()
    })
  })
})
