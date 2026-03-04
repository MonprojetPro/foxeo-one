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
                data: [{ id: 'client-1', name: 'Thomas Dupont', email: 'thomas@test.com' }],
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
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
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

describe('adjustDraft (Story 8.6 — Task 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 6.2 — régénère le brouillon avec la modification demandée', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: '---\nVersion courte du brouillon.\n---\nPlus concis.' },
      error: null,
    })

    const { adjustDraft } = await import('./adjust-draft')
    const result = await adjustDraft({
      previousDraft: 'Bonjour Thomas,\n\nJ\'ai le plaisir de vous informer que votre devis...\n\nCordialement',
      instruction: 'Plus court',
      clientName: 'Thomas',
      draftType: 'email',
    })

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(result.data?.content).toBeTruthy()
    expect(result.data?.draftType).toBe('email')
  })

  it('Task 6.3 — retourne version incrémentée', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Version ajustée.' },
      error: null,
    })

    const { adjustDraft } = await import('./adjust-draft')
    const result = await adjustDraft({
      previousDraft: 'Brouillon v1',
      instruction: 'Ajoute la date de livraison',
      clientName: 'Thomas',
      draftType: 'email',
      currentVersion: 1,
    })

    expect(result.error).toBeNull()
    expect(result.data?.version).toBe(2)
  })

  it('Task 6.1 — retourne VALIDATION_ERROR si instruction vide', async () => {
    const { adjustDraft } = await import('./adjust-draft')
    const result = await adjustDraft({
      previousDraft: 'Brouillon',
      instruction: '',
      clientName: 'Thomas',
      draftType: 'email',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 6.1 — retourne VALIDATION_ERROR si previousDraft vide', async () => {
    const { adjustDraft } = await import('./adjust-draft')
    const result = await adjustDraft({
      previousDraft: '',
      instruction: 'Plus court',
      clientName: 'Thomas',
      draftType: 'email',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 6.4 — conserve le draftType dans la réponse', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Salut Thomas ! Version courte.' },
      error: null,
    })

    const { adjustDraft } = await import('./adjust-draft')
    const result = await adjustDraft({
      previousDraft: 'Message chat original',
      instruction: 'Plus décontracté',
      clientName: 'Thomas',
      draftType: 'chat',
    })

    expect(result.error).toBeNull()
    expect(result.data?.draftType).toBe('chat')
  })

  it('Task 6.2 — retourne LLM_ERROR si Edge Function échoue', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('LLM error') })

    const { adjustDraft } = await import('./adjust-draft')
    const result = await adjustDraft({
      previousDraft: 'Brouillon',
      instruction: 'Plus court',
      clientName: 'Thomas',
      draftType: 'email',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('LLM_ERROR')
  })
})
