import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInvoke = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            ilike: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: [
                  {
                    id: 'client-thomas',
                    name: 'Thomas Dupont',
                    email: 'thomas@test.com',
                    client_type: 'lab',
                    status: 'active',
                  },
                ],
                error: null,
              })),
            })),
          })),
        }
      }
      if (table === 'communication_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  id: 'profile-1',
                  client_id: 'client-thomas',
                  preferred_tone: 'casual',
                  preferred_length: 'balanced',
                  interaction_style: 'collaborative',
                  context_preferences: {},
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                },
                error: null,
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      }
    }),
    functions: {
      invoke: mockInvoke,
    },
  })),
}))

describe('correctAndAdaptText (Story 8.6 — Task 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 2.5 — retourne { data: correctedText, error: null } en cas de succès', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: '---\nSalut Thomas ! Je t\'envoie le devis comme convenu.\n---\nJ\'ai corrigé l\'orthographe.' },
      error: null,
    })

    const { correctAndAdaptText } = await import('./correct-and-adapt-text')
    const result = await correctAndAdaptText('Thomas', 'salu thomas, je tenvoi le devis cmme convenu')

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(typeof result.data).toBe('string')
  })

  it('Task 2.2 — retourne CLIENT_NOT_FOUND si aucun client trouvé', async () => {
    const { createServerSupabaseClient } = await import('@foxeo/supabase')
    vi.mocked(createServerSupabaseClient).mockImplementationOnce(async () => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
      functions: { invoke: mockInvoke },
    }) as never)

    const { correctAndAdaptText } = await import('./correct-and-adapt-text')
    const result = await correctAndAdaptText('InconnuXYZ', 'texte à corriger')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CLIENT_NOT_FOUND')
  })

  it('Task 2.1 — retourne VALIDATION_ERROR si clientName vide', async () => {
    const { correctAndAdaptText } = await import('./correct-and-adapt-text')
    const result = await correctAndAdaptText('', 'texte à corriger')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 2.1 — retourne VALIDATION_ERROR si originalText vide', async () => {
    const { correctAndAdaptText } = await import('./correct-and-adapt-text')
    const result = await correctAndAdaptText('Thomas', '')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 2.4 — retourne LLM_ERROR si Edge Function échoue', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Edge Function error'),
    })

    const { correctAndAdaptText } = await import('./correct-and-adapt-text')
    const result = await correctAndAdaptText('Thomas', 'texte à corriger')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('LLM_ERROR')
  })

  it('Task 2.3 — fonctionne même sans profil de communication (profil null → défaut)', async () => {
    const { createServerSupabaseClient } = await import('@foxeo/supabase')
    vi.mocked(createServerSupabaseClient).mockImplementationOnce(async () => ({
      from: vi.fn((table: string) => {
        if (table === 'clients') {
          return {
            select: vi.fn(() => ({
              ilike: vi.fn(() => ({
                limit: vi.fn(async () => ({
                  data: [{ id: 'client-2', name: 'Alice Martin', email: 'alice@test.com' }],
                  error: null,
                })),
              })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        }
      }),
      functions: {
        invoke: mockInvoke,
      },
    }) as never)

    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Texte corrigé.' },
      error: null,
    })

    const { correctAndAdaptText } = await import('./correct-and-adapt-text')
    const result = await correctAndAdaptText('Alice', 'texte test')

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
  })
})
