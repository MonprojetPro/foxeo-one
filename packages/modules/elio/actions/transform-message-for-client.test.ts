import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transformMessageForClient } from './transform-message-for-client'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockFunctionsInvoke = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    functions: { invoke: mockFunctionsInvoke },
  })),
}))

// Mock getCommunicationProfile
vi.mock('./get-communication-profile', () => ({
  getCommunicationProfile: vi.fn(),
}))

import { getCommunicationProfile } from './get-communication-profile'
const mockGetProfile = vi.mocked(getCommunicationProfile)

describe('transformMessageForClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockGetProfile.mockResolvedValue({ data: null, error: null })
    mockFunctionsInvoke.mockResolvedValue({
      data: { content: 'Message transformé par Élio.' },
      error: null,
    })
  })

  it('retourne une erreur si clientId invalide', async () => {
    const result = await transformMessageForClient({ clientId: 'not-a-uuid', rawMessage: 'hello' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne une erreur si rawMessage vide', async () => {
    const result = await transformMessageForClient({ clientId: '00000000-0000-0000-0000-000000000001', rawMessage: '' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('transforme le message avec profil null (défaut)', async () => {
    mockGetProfile.mockResolvedValueOnce({ data: null, error: null })
    const result = await transformMessageForClient({
      clientId: '00000000-0000-0000-0000-000000000001',
      rawMessage: 'dis lui que le logo est pret',
    })
    expect(result.error).toBeNull()
    expect(result.data?.transformedText).toBe('Message transformé par Élio.')
    expect(result.data?.profileUsed).toBeNull()
  })

  it('transforme le message avec profil chargé', async () => {
    mockGetProfile.mockResolvedValueOnce({
      data: {
        id: 'prof-1',
        clientId: '00000000-0000-0000-0000-000000000001',
        preferredTone: 'formal',
        preferredLength: 'concise',
        interactionStyle: 'directive',
        contextPreferences: {},
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      error: null,
    })
    const result = await transformMessageForClient({
      clientId: '00000000-0000-0000-0000-000000000001',
      rawMessage: 'le logo est prêt',
    })
    expect(result.error).toBeNull()
    expect(result.data?.profileUsed?.tone).toContain('Formel')
    expect(result.data?.profileUsed?.length).toContain('Court')
  })

  it('retourne une erreur si Élio Edge Function échoue', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({ data: null, error: new Error('Edge error') })
    const result = await transformMessageForClient({
      clientId: '00000000-0000-0000-0000-000000000001',
      rawMessage: 'test',
    })
    expect(result.error?.code).toBe('LLM_ERROR')
  })

  it('retourne une erreur si Élio renvoie un contenu vide', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({ data: { content: '' }, error: null })
    const result = await transformMessageForClient({
      clientId: '00000000-0000-0000-0000-000000000001',
      rawMessage: 'test',
    })
    expect(result.error?.code).toBe('LLM_ERROR')
  })

  it('retourne TIMEOUT_ERROR si Élio timeout', async () => {
    mockFunctionsInvoke.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const result = await transformMessageForClient({
      clientId: '00000000-0000-0000-0000-000000000001',
      rawMessage: 'test',
    })
    expect(result.error?.code).toBe('TIMEOUT_ERROR')
  })
})
