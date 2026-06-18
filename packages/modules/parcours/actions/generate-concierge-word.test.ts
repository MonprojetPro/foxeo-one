import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInvoke = vi.fn()
const mockInsert = vi.fn(() => ({ error: null }))
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    functions: { invoke: mockInvoke },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-0000000000c2'
const EVENT = { type: 'agent_reopened', agentLabel: 'Élio Go-to-Market' } as const

describe('generateConciergeWord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ error: null })
  })

  it('returns VALIDATION_ERROR when clientId is missing', async () => {
    const { generateConciergeWord } = await import('./generate-concierge-word')
    const result = await generateConciergeWord('', EVENT)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('stores the AI message (source=ai) on success', async () => {
    mockInvoke.mockResolvedValue({ data: { content: 'Super, on rouvre Go-to-Market !' }, error: null })
    const { generateConciergeWord } = await import('./generate-concierge-word')
    const result = await generateConciergeWord(CLIENT_ID, EVENT)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ body: 'Super, on rouvre Go-to-Market !', source: 'ai' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: CLIENT_ID,
        event_type: 'agent_reopened',
        agent_label: 'Élio Go-to-Market',
        body: 'Super, on rouvre Go-to-Market !',
        source: 'ai',
      })
    )
  })

  it('calls the LLM with the Haiku model', async () => {
    mockInvoke.mockResolvedValue({ data: { content: 'ok' }, error: null })
    const { generateConciergeWord } = await import('./generate-concierge-word')
    await generateConciergeWord(CLIENT_ID, EVENT)

    expect(mockInvoke).toHaveBeenCalledWith(
      'elio-chat',
      expect.objectContaining({
        body: expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
      })
    )
  })

  it('falls back to a template (source=template) when the LLM returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'LLM down' } })
    const { generateConciergeWord } = await import('./generate-concierge-word')
    const result = await generateConciergeWord(CLIENT_ID, EVENT)

    expect(result.data?.source).toBe('template')
    expect(result.data?.body).toContain('Élio Go-to-Market')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ source: 'template' }))
  })

  it('falls back to a template when the LLM returns empty content', async () => {
    mockInvoke.mockResolvedValue({ data: { content: '   ' }, error: null })
    const { generateConciergeWord } = await import('./generate-concierge-word')
    const result = await generateConciergeWord(CLIENT_ID, EVENT)
    expect(result.data?.source).toBe('template')
  })

  it('falls back to a template when the LLM call throws', async () => {
    mockInvoke.mockRejectedValue(new Error('aborted'))
    const { generateConciergeWord } = await import('./generate-concierge-word')
    const result = await generateConciergeWord(CLIENT_ID, EVENT)
    expect(result.data?.source).toBe('template')
  })

  it('returns DATABASE_ERROR when the insert fails', async () => {
    mockInvoke.mockResolvedValue({ data: { content: 'ok' }, error: null })
    mockInsert.mockReturnValue({ error: { message: 'insert failed' } })
    const { generateConciergeWord } = await import('./generate-concierge-word')
    const result = await generateConciergeWord(CLIENT_ID, EVENT)
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
