import { describe, it, expect, vi, beforeEach } from 'vitest'

// maybeSingle est le terminal de la chaîne — on contrôle sa valeur par test.
const mockMaybeSingle = vi.fn()

// Chaîne fluente : chaque méthode renvoie le même objet, sauf maybeSingle (terminal).
const chain = {
  select: vi.fn(() => chain),
  eq: vi.fn(() => chain),
  order: vi.fn(() => chain),
  limit: vi.fn(() => chain),
  maybeSingle: mockMaybeSingle,
}
const mockFrom = vi.fn(() => chain)

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ from: mockFrom })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-0000000000c2'

describe('getOneConciergeWord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when clientId is empty (no DB call)', async () => {
    const { getOneConciergeWord } = await import('./get-one-concierge-word')
    const result = await getOneConciergeWord('')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('filters on dashboard_context=one and maps the latest word', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        body: 'Du nouveau sur ton outil',
        event_type: 'tool_update',
        agent_label: 'Page contact',
        created_at: '2026-06-25T10:00:00Z',
      },
      error: null,
    })

    const { getOneConciergeWord } = await import('./get-one-concierge-word')
    const result = await getOneConciergeWord(CLIENT_ID)

    expect(mockFrom).toHaveBeenCalledWith('client_concierge_messages')
    expect(chain.eq).toHaveBeenCalledWith('client_id', CLIENT_ID)
    expect(chain.eq).toHaveBeenCalledWith('dashboard_context', 'one')
    expect(result).toEqual({
      body: 'Du nouveau sur ton outil',
      eventType: 'tool_update',
      agentLabel: 'Page contact',
      createdAt: '2026-06-25T10:00:00Z',
    })
  })

  it('returns null when no word exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { getOneConciergeWord } = await import('./get-one-concierge-word')
    const result = await getOneConciergeWord(CLIENT_ID)
    expect(result).toBeNull()
  })

  it('returns null (never throws) on DB error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const { getOneConciergeWord } = await import('./get-one-concierge-word')
    const result = await getOneConciergeWord(CLIENT_ID)
    expect(result).toBeNull()
  })

  it('coerces a null agent_label to null in the result', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { body: 'x', event_type: 'tier_changed', agent_label: null, created_at: '2026-06-25T10:00:00Z' },
      error: null,
    })
    const { getOneConciergeWord } = await import('./get-one-concierge-word')
    const result = await getOneConciergeWord(CLIENT_ID)
    expect(result?.agentLabel).toBeNull()
  })
})
