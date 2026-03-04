import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInvoke = vi.fn()

const mockClientRow = {
  id: 'client-sandrine',
  name: 'Sandrine Martin',
  email: 'sandrine@test.com',
  client_type: 'lab',
  status: 'active',
}

const mockProfileRow = {
  id: 'profile-1',
  client_id: 'client-sandrine',
  preferred_tone: 'formal',
  preferred_length: 'balanced',
  interaction_style: 'collaborative',
  context_preferences: {},
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            ilike: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [mockClientRow], error: null })),
            })),
          })),
        }
      }
      if (table === 'communication_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: mockProfileRow, error: null })),
            })),
          })),
        }
      }
      if (table === 'elio_conversations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({
                  data: [{ id: 'conv-1' }],
                  error: null,
                })),
              })),
            })),
          })),
        }
      }
      if (table === 'elio_messages') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          })),
        }
      }
      if (table === 'validation_requests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [], error: null })),
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
    functions: { invoke: mockInvoke },
  })),
}))

describe('generateDraft (Story 8.6 — Task 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 3.6 — retourne { data: draft, error: null } en cas de succès (email)', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: '---\nObjet: Votre devis\nBonjour Sandrine,\n---\nTon formel utilisé.' },
      error: null,
    })

    const { generateDraft } = await import('./generate-draft')
    const result = await generateDraft({
      clientName: 'Sandrine',
      draftType: 'email',
      subject: 'Votre devis est prêt',
    })

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(result.data?.content).toBeTruthy()
    expect(result.data?.draftType).toBe('email')
  })

  it('Task 3.6 — retourne { data: draft } pour validation_hub', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: '---\nRéponse Validation Hub\n---\nAdapté profil.' },
      error: null,
    })

    const { generateDraft } = await import('./generate-draft')
    const result = await generateDraft({
      clientName: 'Sandrine',
      draftType: 'validation_hub',
      subject: 'Brief soumis',
    })

    expect(result.error).toBeNull()
    expect(result.data?.draftType).toBe('validation_hub')
  })

  it('Task 3.6 — retourne { data: draft } pour chat', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Salut Sandrine ! Ton devis est prêt.' },
      error: null,
    })

    const { generateDraft } = await import('./generate-draft')
    const result = await generateDraft({
      clientName: 'Sandrine',
      draftType: 'chat',
      subject: 'Devis prêt',
    })

    expect(result.error).toBeNull()
    expect(result.data?.draftType).toBe('chat')
  })

  it('Task 3.2 — retourne CLIENT_NOT_FOUND si client introuvable', async () => {
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

    const { generateDraft } = await import('./generate-draft')
    const result = await generateDraft({
      clientName: 'InconnuXYZ',
      draftType: 'email',
      subject: 'Test',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CLIENT_NOT_FOUND')
  })

  it('Task 3.1 — retourne VALIDATION_ERROR si clientName vide', async () => {
    const { generateDraft } = await import('./generate-draft')
    const result = await generateDraft({ clientName: '', draftType: 'email', subject: 'Test' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 3.5 — retourne LLM_ERROR si Edge Function échoue', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('LLM down') })

    const { generateDraft } = await import('./generate-draft')
    const result = await generateDraft({
      clientName: 'Sandrine',
      draftType: 'email',
      subject: 'Test',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('LLM_ERROR')
  })
})
