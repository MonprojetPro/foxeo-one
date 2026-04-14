import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMessages, PAGE_SIZE } from './get-messages'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}))

describe('getMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ range: mockRange })
  })

  it('retourne les messages en ordre chronologique (inversé)', async () => {
    mockRange.mockResolvedValueOnce({
      data: [
        { id: 'msg-2', conversation_id: 'conv-1', role: 'assistant', content: 'Réponse', metadata: {}, created_at: '2026-03-02T10:01:00Z' },
        { id: 'msg-1', conversation_id: 'conv-1', role: 'user', content: 'Question', metadata: {}, created_at: '2026-03-02T10:00:00Z' },
      ],
      error: null,
    })

    const result = await getMessages('conv-1', 0)
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(2)
    // Après .reverse(), ordre chronologique : user (10:00) puis assistant (10:01)
    expect(result.data?.[0]?.role).toBe('user')
    expect(result.data?.[1]?.role).toBe('assistant')
  })

  it('utilise la pagination avec range correcte', async () => {
    mockRange.mockResolvedValueOnce({ data: [], error: null })

    await getMessages('conv-1', 2)
    expect(mockRange).toHaveBeenCalledWith(2 * PAGE_SIZE, 3 * PAGE_SIZE - 1)
  })

  it('retourne VALIDATION_ERROR si conversationId vide', async () => {
    const result = await getMessages('', 0)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne DB_ERROR si la requête échoue', async () => {
    mockRange.mockResolvedValueOnce({ data: null, error: new Error('DB error') })

    const result = await getMessages('conv-1', 0)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('page par défaut est 0', async () => {
    mockRange.mockResolvedValueOnce({ data: [], error: null })

    await getMessages('conv-1')
    expect(mockRange).toHaveBeenCalledWith(0, PAGE_SIZE - 1)
  })
})
