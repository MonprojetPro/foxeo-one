import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ClientParcoursAgentWithDetails } from '../types/parcours.types'

const mockGetUser = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const AGENT_ID = '00000000-0000-0000-0000-000000000010'

const mockRows = [
  {
    id: '00000000-0000-0000-0000-000000000020',
    client_id: CLIENT_ID,
    elio_lab_agent_id: AGENT_ID,
    step_order: 1,
    step_label: 'Identité de marque',
    status: 'pending',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    elio_lab_agents: {
      id: AGENT_ID,
      name: 'Branding Expert',
      description: 'Spécialiste branding',
      image_path: '/agents/branding.png',
    },
  },
]

describe('getClientParcoursAgents Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockOrder.mockResolvedValue({ data: mockRows, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { getClientParcoursAgents } = await import('./get-client-parcours-agents')
    const result = await getClientParcoursAgents({ clientId: CLIENT_ID })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { getClientParcoursAgents } = await import('./get-client-parcours-agents')
    const result = await getClientParcoursAgents({ clientId: 'not-uuid' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns mapped agents with details on success', async () => {
    const { getClientParcoursAgents } = await import('./get-client-parcours-agents')
    const result = await getClientParcoursAgents({ clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    const agents = result.data as ClientParcoursAgentWithDetails[]
    expect(agents).toHaveLength(1)
    expect(agents[0].stepLabel).toBe('Identité de marque')
    expect(agents[0].stepOrder).toBe(1)
    expect(agents[0].agentName).toBe('Branding Expert')
    expect(agents[0].agentImagePath).toBe('/agents/branding.png')
    expect(agents[0].status).toBe('pending')
  })

  it('returns empty array when client has no parcours agents', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { getClientParcoursAgents } = await import('./get-client-parcours-agents')
    const result = await getClientParcoursAgents({ clientId: CLIENT_ID })
    expect(result.data).toEqual([])
  })

  it('falls back to "(agent supprimé)" when elio_lab_agents is null', async () => {
    mockOrder.mockResolvedValue({
      data: [{ ...mockRows[0], elio_lab_agents: null }],
      error: null,
    })
    const { getClientParcoursAgents } = await import('./get-client-parcours-agents')
    const result = await getClientParcoursAgents({ clientId: CLIENT_ID })
    expect((result.data as ClientParcoursAgentWithDetails[])[0].agentName).toBe('(agent supprimé)')
  })

  it('returns DB_ERROR when query fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { getClientParcoursAgents } = await import('./get-client-parcours-agents')
    const result = await getClientParcoursAgents({ clientId: CLIENT_ID })
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
