import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockConvInsert = vi.fn()
const mockConvSingle = vi.fn()
const mockConvSelect = vi.fn(() => ({ single: mockConvSingle }))

// Mocks pour la logique graduation welcome
const mockClientMaybeSingle = vi.fn()
const mockConvCount = vi.fn()
const mockProfileMaybeSingle = vi.fn()
const mockMsgInsert = vi.fn()
const mockClientConfigMaybeSingle = vi.fn()

const CONV_DATA = {
  id: 'conv-new',
  user_id: 'user-1',
  dashboard_type: 'lab',
  title: 'Nouvelle conversation',
  created_at: '2026-03-02T10:00:00Z',
  updated_at: '2026-03-02T10:00:00Z',
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
    from: vi.fn((table: string) => {
      if (table === 'elio_conversations') {
        return {
          insert: mockConvInsert,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => mockConvCount()),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: mockClientMaybeSingle })),
          })),
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: mockClientConfigMaybeSingle })),
          })),
        }
      }
      if (table === 'communication_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: mockProfileMaybeSingle })),
          })),
        }
      }
      if (table === 'elio_messages') {
        return { insert: mockMsgInsert }
      }
      return {}
    }),
  })),
}))

describe('newConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConvInsert.mockReturnValue({ select: mockConvSelect })
    // Par défaut : client non gradué
    mockClientMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockConvCount.mockResolvedValue({ count: 1, error: null })
    mockProfileMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockMsgInsert.mockResolvedValue({ error: null })
    // Par défaut : pas de client_config (guard ne bloque pas)
    mockClientConfigMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('crée une conversation et retourne { data, error: null }', async () => {
    mockConvSingle.mockResolvedValueOnce({ data: { ...CONV_DATA, dashboard_type: 'lab' }, error: null })

    const { newConversation } = await import('./new-conversation')
    const result = await newConversation('lab')

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('conv-new')
    expect(result.data?.dashboardType).toBe('lab')
    expect(result.data?.title).toBe('Nouvelle conversation')
  })

  it('retourne AUTH_ERROR si utilisateur non authentifié', async () => {
    vi.mocked(
      (await import('@monprojetpro/supabase')).createServerSupabaseClient
    ).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: new Error('Not authenticated') })),
      },
      from: vi.fn(),
    } as never)

    const { newConversation } = await import('./new-conversation')
    const result = await newConversation('lab')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_ERROR')
  })

  it('retourne DB_ERROR si l\'insertion échoue', async () => {
    mockConvSingle.mockResolvedValueOnce({ data: null, error: new Error('DB error') })

    const { newConversation } = await import('./new-conversation')
    const result = await newConversation('hub')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('retourne la conversation One sans message graduation si client non gradué', async () => {
    mockConvSingle.mockResolvedValueOnce({ data: { ...CONV_DATA, dashboard_type: 'one' }, error: null })
    mockClientMaybeSingle.mockResolvedValueOnce({ data: { id: 'client-1', graduated_at: null }, error: null })

    const { newConversation } = await import('./new-conversation')
    const result = await newConversation('one')

    expect(result.error).toBeNull()
    expect(result.data?.dashboardType).toBe('one')
    // Pas de message graduation inséré
    expect(mockMsgInsert).not.toHaveBeenCalled()
  })

  it('insère message d\'accueil post-graduation pour client gradué < 7j (première conv One)', async () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 3) // 3 jours — dans les 7 jours

    mockConvSingle.mockResolvedValueOnce({ data: { ...CONV_DATA, dashboard_type: 'one' }, error: null })
    mockClientMaybeSingle.mockResolvedValueOnce({
      data: { id: 'client-1', graduated_at: recentDate.toISOString() },
      error: null,
    })
    mockConvCount.mockResolvedValueOnce({ count: 1, error: null }) // première conv
    mockProfileMaybeSingle.mockResolvedValueOnce({ data: { tutoiement: false }, error: null })
    mockMsgInsert.mockResolvedValueOnce({ error: null })

    const { newConversation } = await import('./new-conversation')
    const result = await newConversation('one')

    expect(result.error).toBeNull()
    expect(mockMsgInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conv-new',
        role: 'assistant',
        metadata: expect.objectContaining({ graduationWelcome: true }),
      })
    )
  })

  it('adapte le ton avec tutoiement si profil indique tutoiement=true', async () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 2)

    mockConvSingle.mockResolvedValueOnce({ data: { ...CONV_DATA, dashboard_type: 'one' }, error: null })
    mockClientMaybeSingle.mockResolvedValueOnce({
      data: { id: 'client-1', graduated_at: recentDate.toISOString() },
      error: null,
    })
    mockConvCount.mockResolvedValueOnce({ count: 1, error: null })
    mockProfileMaybeSingle.mockResolvedValueOnce({ data: { tutoiement: true }, error: null })
    mockMsgInsert.mockResolvedValueOnce({ error: null })

    const { newConversation } = await import('./new-conversation')
    await newConversation('one')

    const insertArg = mockMsgInsert.mock.calls[0][0]
    expect(insertArg.content).toContain('ton')
  })

  it('n\'insère pas de message welcome si client gradué il y a plus de 7 jours', async () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 10) // 10 jours — hors fenêtre

    mockConvSingle.mockResolvedValueOnce({ data: { ...CONV_DATA, dashboard_type: 'one' }, error: null })
    mockClientMaybeSingle.mockResolvedValueOnce({
      data: { id: 'client-1', graduated_at: oldDate.toISOString() },
      error: null,
    })

    const { newConversation } = await import('./new-conversation')
    const result = await newConversation('one')

    expect(result.error).toBeNull()
    expect(mockMsgInsert).not.toHaveBeenCalled()
  })

  it('retourne ELIO_LAB_DISABLED si elio_lab_enabled=false pour une conv Lab', async () => {
    mockClientMaybeSingle.mockResolvedValueOnce({ data: { id: 'client-1' }, error: null })
    mockClientConfigMaybeSingle.mockResolvedValueOnce({
      data: { elio_lab_enabled: false },
      error: null,
    })

    const { newConversation } = await import('./new-conversation')
    const result = await newConversation('lab')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('ELIO_LAB_DISABLED')
  })

  it('autorise la conv Lab si elio_lab_enabled=true', async () => {
    mockClientMaybeSingle.mockResolvedValueOnce({ data: { id: 'client-1' }, error: null })
    mockClientConfigMaybeSingle.mockResolvedValueOnce({
      data: { elio_lab_enabled: true },
      error: null,
    })
    mockConvSingle.mockResolvedValueOnce({ data: { ...CONV_DATA, dashboard_type: 'lab' }, error: null })

    const { newConversation } = await import('./new-conversation')
    const result = await newConversation('lab')

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('conv-new')
  })

  it('n\'insère pas de message welcome si ce n\'est pas la première conv One', async () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 1)

    mockConvSingle.mockResolvedValueOnce({ data: { ...CONV_DATA, dashboard_type: 'one' }, error: null })
    mockClientMaybeSingle.mockResolvedValueOnce({
      data: { id: 'client-1', graduated_at: recentDate.toISOString() },
      error: null,
    })
    mockConvCount.mockResolvedValueOnce({ count: 3, error: null }) // déjà 3 convs One

    const { newConversation } = await import('./new-conversation')
    await newConversation('one')

    expect(mockMsgInsert).not.toHaveBeenCalled()
  })
})
