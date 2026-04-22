import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logTokenUsage } from './log-token-usage'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@monprojetpro/supabase', () => ({
  createServiceRoleSupabaseClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('../utils/token-cost-calculator', () => ({
  calculateCostEur: vi.fn(() => 0.000123),
}))

describe('logTokenUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('insère un enregistrement avec les données correctes', async () => {
    await logTokenUsage({
      clientId: 'client-123',
      elioLabAgentId: null,
      conversationId: 'conv-456',
      inputTokens: 1000,
      outputTokens: 500,
      model: 'gemini-2.5-flash',
    })

    expect(mockFrom).toHaveBeenCalledWith('elio_token_usage')
    expect(mockInsert).toHaveBeenCalledWith({
      client_id: 'client-123',
      elio_lab_agent_id: null,
      conversation_id: 'conv-456',
      input_tokens: 1000,
      output_tokens: 500,
      model: 'gemini-2.5-flash',
      cost_eur: 0.000123,
    })
  })

  it('ne fait rien si les tokens sont 0', async () => {
    await logTokenUsage({
      inputTokens: 0,
      outputTokens: 0,
      model: 'gemini-2.5-flash',
    })

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('ne lève pas d\'exception si l\'insert échoue', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } })

    await expect(
      logTokenUsage({ inputTokens: 100, outputTokens: 50, model: 'gemini-2.5-flash' })
    ).resolves.not.toThrow()
  })

  it('gère les champs optionnels absents (undefined → null)', async () => {
    await logTokenUsage({ inputTokens: 100, outputTokens: 50, model: 'gemini-2.5-flash' })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: null, elio_lab_agent_id: null, conversation_id: null })
    )
  })
})
