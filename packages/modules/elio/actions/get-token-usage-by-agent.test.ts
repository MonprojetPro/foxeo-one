import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTokenUsageByAgent } from './get-token-usage-by-agent'

const mockSupabase = { from: vi.fn() }

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const mockRows = [
  { input_tokens: 1000, output_tokens: 400, cost_eur: 0.001, conversation_id: 'conv-1' },
  { input_tokens: 800, output_tokens: 300, cost_eur: 0.0008, conversation_id: 'conv-1' },
  { input_tokens: 500, output_tokens: 200, cost_eur: 0.0005, conversation_id: 'conv-2' },
]

describe('getTokenUsageByAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockUsageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    }

    const mockAgentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Agent Onboarding' }, error: null }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'elio_token_usage') return mockUsageChain
      if (table === 'elio_lab_agents') return mockAgentChain
      return mockUsageChain
    })
  })

  it('retourne les totaux corrects pour un agent', async () => {
    const { data, error } = await getTokenUsageByAgent('agent-1')
    expect(error).toBeNull()
    // Le nom est résolu côté composant depuis byAgent — agentName retourne agentId
    expect(data!.agentName).toBe('agent-1')
    expect(data!.totalInputTokens).toBe(2300)   // 1000+800+500
    expect(data!.totalOutputTokens).toBe(900)   // 400+300+200
    expect(data!.totalTokens).toBe(3200)
    expect(data!.conversationCount).toBe(2)     // conv-1 et conv-2
    expect(data!.avgTokensPerConversation).toBe(1600)
  })

  it('retourne VALIDATION_ERROR si agentId vide', async () => {
    const { data, error } = await getTokenUsageByAgent('')
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne DATABASE_ERROR si la requête échoue', async () => {
    const mockErrorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockSupabase.from.mockReturnValue(mockErrorChain)

    const { data, error } = await getTokenUsageByAgent('agent-1')
    expect(data).toBeNull()
    expect(error!.code).toBe('DATABASE_ERROR')
  })
})
