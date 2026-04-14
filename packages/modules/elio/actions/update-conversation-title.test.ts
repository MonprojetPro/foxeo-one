import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateConversationTitle } from './update-conversation-title'

const mockUpdate = vi.fn()
const mockEq = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}))

describe('updateConversationTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue({ eq: mockEq })
  })

  it('met à jour le titre avec succès', async () => {
    mockEq.mockResolvedValueOnce({ error: null })

    const result = await updateConversationTitle('conv-1', 'Nouveau titre')
    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Nouveau titre' })
  })

  it('retourne VALIDATION_ERROR si conversationId vide', async () => {
    const result = await updateConversationTitle('', 'titre')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si titre vide', async () => {
    const result = await updateConversationTitle('conv-1', '   ')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si titre > 100 caractères', async () => {
    const result = await updateConversationTitle('conv-1', 'A'.repeat(101))
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('trim le titre avant de le sauvegarder', async () => {
    mockEq.mockResolvedValueOnce({ error: null })

    await updateConversationTitle('conv-1', '  Titre trimé  ')
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Titre trimé' })
  })

  it('retourne DB_ERROR si la mise à jour échoue', async () => {
    mockEq.mockResolvedValueOnce({ error: new Error('DB error') })

    const result = await updateConversationTitle('conv-1', 'Titre')
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
