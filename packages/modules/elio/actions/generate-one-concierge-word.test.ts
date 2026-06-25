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
const EVENT = { type: 'tool_update', title: 'Nouvelle page contact' } as const

describe('generateOneConciergeWord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ error: null })
  })

  it('returns VALIDATION_ERROR when clientId is missing', async () => {
    const { generateOneConciergeWord } = await import('./generate-one-concierge-word')
    const result = await generateOneConciergeWord('', EVENT)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('stores the AI message (source=ai) with dashboard_context=one on success', async () => {
    mockInvoke.mockResolvedValue({ data: { content: 'Du nouveau sur ton outil !' }, error: null })
    const { generateOneConciergeWord } = await import('./generate-one-concierge-word')
    const result = await generateOneConciergeWord(CLIENT_ID, EVENT)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ body: 'Du nouveau sur ton outil !', source: 'ai' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: CLIENT_ID,
        event_type: 'tool_update',
        agent_label: 'Nouvelle page contact',
        body: 'Du nouveau sur ton outil !',
        source: 'ai',
        dashboard_context: 'one',
      })
    )
  })

  it('calls the LLM with the Haiku model', async () => {
    mockInvoke.mockResolvedValue({ data: { content: 'ok' }, error: null })
    const { generateOneConciergeWord } = await import('./generate-one-concierge-word')
    await generateOneConciergeWord(CLIENT_ID, EVENT)

    expect(mockInvoke).toHaveBeenCalledWith(
      'elio-chat',
      expect.objectContaining({
        body: expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
      })
    )
  })

  it('falls back to a template (source=template) when the LLM returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'LLM down' } })
    const { generateOneConciergeWord } = await import('./generate-one-concierge-word')
    const result = await generateOneConciergeWord(CLIENT_ID, EVENT)

    expect(result.data?.source).toBe('template')
    expect(result.data?.body).toContain('Nouvelle page contact')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ source: 'template' }))
  })

  it('falls back to a template when the LLM returns empty content', async () => {
    mockInvoke.mockResolvedValue({ data: { content: '   ' }, error: null })
    const { generateOneConciergeWord } = await import('./generate-one-concierge-word')
    const result = await generateOneConciergeWord(CLIENT_ID, EVENT)
    expect(result.data?.source).toBe('template')
  })

  it('falls back to a template when the LLM call throws', async () => {
    mockInvoke.mockRejectedValue(new Error('aborted'))
    const { generateOneConciergeWord } = await import('./generate-one-concierge-word')
    const result = await generateOneConciergeWord(CLIENT_ID, EVENT)
    expect(result.data?.source).toBe('template')
  })

  it('returns DATABASE_ERROR when the insert fails', async () => {
    mockInvoke.mockResolvedValue({ data: { content: 'ok' }, error: null })
    mockInsert.mockReturnValue({ error: { message: 'insert failed' } })
    const { generateOneConciergeWord } = await import('./generate-one-concierge-word')
    const result = await generateOneConciergeWord(CLIENT_ID, EVENT)
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})

describe('generateOneConciergeWord — exhaustivité des événements (fallbacks)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ error: null })
    // Force le fallback templaté pour vérifier les messages déterministes de chaque événement.
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'forced fallback' } })
  })

  const CASES = [
    { event: { type: 'graduation_welcome', clientName: 'Acme' }, expectIn: 'Acme' },
    { event: { type: 'tool_comment', title: 'Header' }, expectIn: 'Header' },
    { event: { type: 'evolution_approved', requestLabel: 'Export PDF' }, expectIn: 'Export PDF' },
    { event: { type: 'evolution_revision', requestLabel: 'Export PDF', comment: 'précise le format' }, expectIn: 'Export PDF' },
    { event: { type: 'module_enabled', moduleLabel: 'Facturation' }, expectIn: 'Facturation' },
    { event: { type: 'tier_changed', tierLabel: 'One+' }, expectIn: 'One+' },
    { event: { type: 'support_status_changed', subject: 'Bug login', status: 'en cours' }, expectIn: 'Bug login' },
  ] as const

  for (const { event, expectIn } of CASES) {
    it(`génère un fallback non vide pour ${event.type}`, async () => {
      const { generateOneConciergeWord } = await import('./generate-one-concierge-word')
      const result = await generateOneConciergeWord(CLIENT_ID, event)
      expect(result.error).toBeNull()
      expect(result.data?.source).toBe('template')
      expect(result.data?.body.length).toBeGreaterThan(0)
      expect(result.data?.body).toContain(expectIn)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: event.type, dashboard_context: 'one' })
      )
    })
  }
})
