import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveElioMessage } from './save-elio-message'

const mockInsert = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}))

describe('saveElioMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ select: mockSelect })
  })

  it('persiste un message et le retourne transformé en camelCase', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Bonjour',
        metadata: {},
        created_at: '2026-03-02T10:00:00Z',
      },
      error: null,
    })

    const result = await saveElioMessage('conv-1', 'user', 'Bonjour')
    expect(result.error).toBeNull()
    expect(result.data?.conversationId).toBe('conv-1')
    expect(result.data?.role).toBe('user')
  })

  it('retourne VALIDATION_ERROR si conversationId vide', async () => {
    const result = await saveElioMessage('', 'user', 'test')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si content vide', async () => {
    const result = await saveElioMessage('conv-1', 'user', '   ')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne DB_ERROR si l\'insertion échoue', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('DB error') })

    const result = await saveElioMessage('conv-1', 'assistant', 'Réponse')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('passe les metadata optionnelles', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'msg-2',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'Réponse',
        metadata: { feedback: 'useful' },
        created_at: '2026-03-02T10:00:00Z',
      },
      error: null,
    })

    await saveElioMessage('conv-1', 'assistant', 'Réponse', { feedback: 'useful' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { feedback: 'useful' } })
    )
  })
})
