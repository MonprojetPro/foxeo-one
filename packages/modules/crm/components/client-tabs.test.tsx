import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientTabs, type ExtraTab } from './client-tabs'
import type { Client } from '../types/crm.types'

// Mock Next.js navigation (consommé par useClientTabNav)
const mockPush = vi.fn()
const mockUseSearchParams = vi.fn(() => new URLSearchParams())
const mockUsePathname = vi.fn(() => '/modules/crm/clients/123')

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockUseSearchParams(),
  usePathname: () => mockUsePathname(),
}))

const mockClient: Client = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  operatorId: '550e8400-e29b-41d4-a716-4466554400aa',
  name: 'Jean Test',
  company: 'Test SARL',
  email: 'jean@test.fr',
  clientType: 'lab',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as Client

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('ClientTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('affiche les onglets de base (boutons avec aria-label) — plus d\'onglet Infos', () => {
    renderWithQueryClient(<ClientTabs client={mockClient} />)

    expect(screen.getByRole('button', { name: /historique/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /documents/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /échanges/i })).toBeInTheDocument()
    // L'onglet Infos a été fusionné dans le cockpit Pilote.
    expect(screen.queryByRole('button', { name: /^infos$/i })).not.toBeInTheDocument()
  })

  it('active l\'onglet correspondant au param d\'URL', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('tab=historique'))

    renderWithQueryClient(<ClientTabs client={mockClient} />)

    expect(screen.getByRole('button', { name: /historique/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('met à jour l\'URL au changement d\'onglet', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<ClientTabs client={mockClient} />)

    await user.click(screen.getByRole('button', { name: /historique/i }))

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=historique'))
  })

  it('affiche l\'onglet « Pilote » en 1ʳᵉ position et l\'active par défaut quand présent', () => {
    const extraTabs: ExtraTab[] = [
      { value: 'pilote', label: 'Pilote', content: <div>Cockpit</div> },
    ]
    renderWithQueryClient(<ClientTabs client={mockClient} extraTabs={extraTabs} />)

    const pilote = screen.getByRole('button', { name: /pilote/i })
    expect(pilote).toBeInTheDocument()
    expect(pilote).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Cockpit')).toBeInTheDocument()
  })
})
