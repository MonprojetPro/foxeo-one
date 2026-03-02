import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getConversations } from './get-conversations'

const mockSelect = vi.fn()
const mockEqUserId = vi.fn()
const mockEqDashboard = vi.fn()
const mockOrder = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}))

describe('getConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ eq: mockEqUserId })
    mockEqUserId.mockReturnValue({ eq: mockEqDashboard })
    mockEqDashboard.mockReturnValue({ order: mockOrder })
  })

  it('retourne les conversations triées par updated_at DESC', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'conv-1',
          user_id: 'user-1',
          dashboard_type: 'lab',
          title: 'Conv récente',
          created_at: '2026-03-02T10:00:00Z',
          updated_at: '2026-03-02T10:00:00Z',
          elio_messages: [{ content: 'Dernier msg', created_at: '2026-03-02T10:00:00Z' }],
        },
      ],
      error: null,
    })

    const result = await getConversations('lab')
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]?.title).toBe('Conv récente')
    expect(result.data?.[0]?.lastMessagePreview).toBe('Dernier msg')
  })

  it('retourne AUTH_ERROR si utilisateur non authentifié', async () => {
    vi.mocked(
      (await import('@foxeo/supabase')).createServerSupabaseClient
    ).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: new Error('Not auth') })),
      },
      from: vi.fn(),
    } as never)

    const result = await getConversations('lab')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_ERROR')
  })

  it('retourne DB_ERROR si la requête échoue', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: new Error('DB error'),
    })

    const result = await getConversations('hub')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('retourne un tableau vide si aucune conversation', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    const result = await getConversations('one')
    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('retourne lastMessagePreview vide si pas de messages', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'conv-2',
          user_id: 'user-1',
          dashboard_type: 'one',
          title: 'Conv vide',
          created_at: '2026-03-02T10:00:00Z',
          updated_at: '2026-03-02T10:00:00Z',
          elio_messages: [],
        },
      ],
      error: null,
    })

    const result = await getConversations('one')
    expect(result.data?.[0]?.lastMessagePreview).toBe('')
  })
})
