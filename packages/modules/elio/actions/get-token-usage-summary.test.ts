import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTokenUsageSummary } from './get-token-usage-summary'

// Données de test
const mockRows = [
  {
    input_tokens: 1000, output_tokens: 500, cost_eur: 0.001,
    created_at: '2026-04-20T10:00:00Z', client_id: 'client-1', elio_lab_agent_id: 'agent-1', conversation_id: 'conv-1',
  },
  {
    input_tokens: 2000, output_tokens: 800, cost_eur: 0.002,
    created_at: '2026-04-21T10:00:00Z', client_id: 'client-2', elio_lab_agent_id: 'agent-1', conversation_id: 'conv-2',
  },
  {
    input_tokens: 500, output_tokens: 200, cost_eur: 0.0005,
    created_at: '2026-04-22T10:00:00Z', client_id: null, elio_lab_agent_id: null, conversation_id: null,
  },
]

const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getTokenUsageSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup chaîne Supabase pour elio_token_usage (inclut .limit())
    const mockTokenChain = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    }

    // Setup pour clients
    const mockClientsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 'client-1', company_name: 'Acme Corp', full_name: null },
          { id: 'client-2', company_name: null, full_name: 'Jean Dupont' },
        ],
        error: null,
      }),
    }

    // Setup pour elio_lab_agents
    const mockAgentsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'agent-1', name: 'Agent Onboarding' }],
        error: null,
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'elio_token_usage') return mockTokenChain
      if (table === 'clients') return mockClientsChain
      if (table === 'elio_lab_agents') return mockAgentsChain
      return mockTokenChain
    })
  })

  it('retourne les totaux corrects', async () => {
    const { data, error } = await getTokenUsageSummary()
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.totalInputTokens).toBe(3500)  // 1000+2000+500
    expect(data!.totalOutputTokens).toBe(1500) // 500+800+200
    expect(data!.totalTokens).toBe(5000)
    expect(data!.totalCostEur).toBeCloseTo(0.0035)
  })

  it('retourne le top 5 clients triés par consommation', async () => {
    const { data } = await getTokenUsageSummary()
    expect(data!.topClients.length).toBeGreaterThan(0)
    // client-2 a plus de tokens (2800) que client-1 (1500)
    expect(data!.topClients[0].clientName).toBe('Jean Dupont')
  })

  it('affiche "Hub (MiKL)" pour les lignes sans client', async () => {
    const { data } = await getTokenUsageSummary()
    const hubEntry = data!.topClients.find((c) => c.clientId === null)
    expect(hubEntry?.clientName).toBe('Hub (MiKL)')
  })

  it('retourne la répartition par agent', async () => {
    const { data } = await getTokenUsageSummary()
    expect(data!.byAgent.length).toBe(1)
    expect(data!.byAgent[0].agentName).toBe('Agent Onboarding')
    expect(data!.byAgent[0].conversations).toBe(2)
  })

  it('retourne error si la requête DB échoue', async () => {
    const mockErrorChain = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockSupabase.from.mockReturnValue(mockErrorChain)

    const { data, error } = await getTokenUsageSummary()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error!.code).toBe('DATABASE_ERROR')
  })
})
