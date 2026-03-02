import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateConversationTitle } from './generate-conversation-title'

const mockInvoke = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    functions: { invoke: mockInvoke },
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}))

describe('generateConversationTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockResolvedValue({ error: null })
  })

  it('génère un titre via LLM et met à jour la conversation', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Parcours création entreprise' },
      error: null,
    })

    const result = await generateConversationTitle('conv-1', ['Bonjour', 'Comment créer une entreprise ?', 'Quel statut choisir ?'])

    expect(result.error).toBeNull()
    expect(result.data).toBe('Parcours création entreprise')
    expect(mockInvoke).toHaveBeenCalledWith('elio-chat', expect.objectContaining({
      body: expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 20,
      }),
    }))
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Parcours création entreprise' })
  })

  it('retourne VALIDATION_ERROR si conversationId manquant', async () => {
    const result = await generateConversationTitle('', ['message'])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si messages vides', async () => {
    const result = await generateConversationTitle('conv-1', [])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne LLM_ERROR si la fonction retourne une erreur', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Edge function error'),
    })

    const result = await generateConversationTitle('conv-1', ['msg1', 'msg2', 'msg3'])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('LLM_ERROR')
  })

  it('retourne LLM_ERROR si le titre retourné est vide', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: '  ' },
      error: null,
    })

    const result = await generateConversationTitle('conv-1', ['msg1', 'msg2', 'msg3'])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('LLM_ERROR')
  })

  it('retourne DB_ERROR si la mise à jour du titre échoue', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Titre généré' },
      error: null,
    })
    mockEq.mockResolvedValueOnce({ error: new Error('DB update failed') })

    const result = await generateConversationTitle('conv-1', ['msg1', 'msg2', 'msg3'])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('tronque le titre à 100 caractères maximum', async () => {
    const longTitle = 'A'.repeat(200)
    mockInvoke.mockResolvedValueOnce({
      data: { content: longTitle },
      error: null,
    })

    const result = await generateConversationTitle('conv-1', ['msg'])
    expect(result.data).toHaveLength(100)
  })

  it('utilise seulement les 3 premiers messages', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Titre' },
      error: null,
    })

    await generateConversationTitle('conv-1', ['MSG_ALPHA', 'MSG_BRAVO', 'MSG_CHARLIE', 'MSG_DELTA', 'MSG_ECHO'])

    const callBody = mockInvoke.mock.calls[0]?.[1].body.message as string
    expect(callBody).toContain('MSG_ALPHA')
    expect(callBody).toContain('MSG_BRAVO')
    expect(callBody).toContain('MSG_CHARLIE')
    expect(callBody).not.toContain('MSG_DELTA')
  })
})
