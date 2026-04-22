import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientParcoursAgentsList } from './client-parcours-agents-list'
import type { ClientParcoursAgentWithDetails } from '../types/parcours.types'

vi.mock('../actions/get-client-parcours-agents', () => ({
  getClientParcoursAgents: vi.fn(),
}))
vi.mock('../actions/add-parcours-step', () => ({
  addParcoursStep: vi.fn(),
}))
vi.mock('./launch-parcours-modal', () => ({
  LaunchParcoursModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Assembler le parcours client">
      <button onClick={onClose}>Fermer</button>
    </div>
  ),
}))
vi.mock('./add-step-modal', () => ({
  AddStepModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Ajouter une étape au parcours">
      <button onClick={onClose}>Fermer</button>
    </div>
  ),
}))
vi.mock('@monprojetpro/module-elio', () => ({
  InjectStepContextPanel: ({ open, onClose, stepLabel }: { open: boolean; onClose: () => void; stepLabel: string }) =>
    open ? (
      <div role="dialog" aria-label={`Nourrir Élio — ${stepLabel}`}>
        <button onClick={onClose}>Fermer</button>
      </div>
    ) : null,
}))
vi.mock('../actions/get-step-context-counts', () => ({
  getStepContextCounts: vi.fn(),
}))

import { getClientParcoursAgents } from '../actions/get-client-parcours-agents'
import { getStepContextCounts } from '../actions/get-step-context-counts'

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

const mockSteps: ClientParcoursAgentWithDetails[] = [
  {
    id: '00000000-0000-0000-0000-000000000020',
    clientId: CLIENT_ID,
    elioLabAgentId: '00000000-0000-0000-0000-000000000010',
    stepOrder: 1,
    stepLabel: 'Identité de marque',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    agentName: 'Branding Expert',
    agentDescription: 'Spécialiste branding',
    agentImagePath: null,
  },
  {
    id: '00000000-0000-0000-0000-000000000021',
    clientId: CLIENT_ID,
    elioLabAgentId: '00000000-0000-0000-0000-000000000011',
    stepOrder: 2,
    stepLabel: 'Positionnement marché',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    agentName: 'Market Strategist',
    agentDescription: null,
    agentImagePath: '/agents/market.png',
  },
]

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('ClientParcoursAgentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getStepContextCounts).mockResolvedValue({ data: {}, error: null })
  })

  it('shows skeleton while loading', () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    expect(screen.getByLabelText('Chargement du parcours')).toBeTruthy()
  })

  it('shows "Lancer le Lab" button when no steps exist', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: [], error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Lancer le Lab/i })).toBeTruthy()
    )
  })

  it('shows steps list when steps exist', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() => {
      expect(screen.getByText('Identité de marque')).toBeTruthy()
      expect(screen.getByText('Positionnement marché')).toBeTruthy()
    })
  })

  it('shows agent names for each step', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() => {
      expect(screen.getByText('Branding Expert')).toBeTruthy()
      expect(screen.getByText('Market Strategist')).toBeTruthy()
    })
  })

  it('shows correct status labels', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() => {
      expect(screen.getByText('En cours')).toBeTruthy()
      expect(screen.getByText('En attente')).toBeTruthy()
    })
  })

  it('shows "Ajouter une étape" button when steps exist', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Ajouter une étape/i })).toBeTruthy()
    )
  })

  it('opens launch modal on "Lancer le Lab" click', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: [], error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() => screen.getByRole('button', { name: /Lancer le Lab/i }))
    await userEvent.click(screen.getByRole('button', { name: /Lancer le Lab/i }))
    expect(screen.getByRole('dialog', { name: /Assembler le parcours client/i })).toBeTruthy()
  })

  it('opens add step modal on "Ajouter une étape" click', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() => screen.getByRole('button', { name: /Ajouter une étape/i }))
    await userEvent.click(screen.getByRole('button', { name: /Ajouter une étape/i }))
    expect(screen.getByRole('dialog', { name: /Ajouter une étape/i })).toBeTruthy()
  })

  it('shows error state when query fails', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({
      data: null,
      error: { message: 'DB error', code: 'DB_ERROR' },
    })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() =>
      expect(screen.getByText(/Impossible de charger/i)).toBeTruthy()
    )
  })

  it('shows "Nourrir Élio" button for each step', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /Nourrir Élio/i })
      expect(buttons).toHaveLength(mockSteps.length)
    })
  })

  it('opens inject context panel on "Nourrir Élio" click', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() => screen.getAllByRole('button', { name: /Nourrir Élio/i }))
    await userEvent.click(screen.getAllByRole('button', { name: /Nourrir Élio/i })[0])
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /Nourrir Élio/i })).toBeTruthy()
    )
  })

  it('shows pending context badge when count > 0', async () => {
    vi.mocked(getClientParcoursAgents).mockResolvedValue({ data: mockSteps, error: null })
    vi.mocked(getStepContextCounts).mockResolvedValue({
      data: { [mockSteps[0].id]: 2 },
      error: null,
    })
    render(<ClientParcoursAgentsList clientId={CLIENT_ID} />, { wrapper })
    await waitFor(() =>
      expect(screen.getByLabelText(/2 contextes injectés/i)).toBeTruthy()
    )
  })
})
