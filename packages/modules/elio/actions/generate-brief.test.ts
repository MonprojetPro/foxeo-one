import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @anthropic-ai/sdk
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  }
})

// Mock @monprojetpro/supabase
vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { generateBrief } from './generate-brief'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import Anthropic from '@anthropic-ai/sdk'

const mockCreate = vi.fn()

const makeSupabaseMock = (overrides: Record<string, unknown> = {}) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
  },
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'clients') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'client-1', operator_id: 'op-1' },
          error: null,
        }),
      }
    }
    if (table === 'parcours_steps') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'step-1',
            step_number: 2,
            title: 'Positionnement',
            description: 'Définir votre positionnement',
            brief_template: '# Template\n## Objectif\n## Résultats',
            parcours: { client_id: 'client-1' },
          },
          error: null,
        }),
      }
    }
    if (table === 'communication_profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'profile-1',
            client_id: 'client-1',
            preferred_tone: 'friendly',
            preferred_length: 'balanced',
            interaction_style: 'collaborative',
            context_preferences: null,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
          error: null,
        }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'table not found' } }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  }),
  ...overrides,
})

describe('generateBrief', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    ;(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    }))
  })

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv
  })

  it('retourne un brief généré avec succès', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '# Brief Positionnement\n\nVoici le brief...' }],
    })

    const result = await generateBrief('step-1')

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data?.brief).toContain('Brief Positionnement')
  })

  it('retourne CONFIG_ERROR si ANTHROPIC_API_KEY manquante', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const result = await generateBrief('step-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFIG_ERROR')
  })

  it('retourne UNAUTHORIZED si utilisateur non connecté', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const result = await generateBrief('step-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne NOT_FOUND si client non trouvé', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as never)

    const result = await generateBrief('step-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne NOT_FOUND si étape non trouvée', async () => {
    const supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'client-1', operator_id: 'op-1' },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await generateBrief('nonexistent-step')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne FORBIDDEN si étape appartient à un autre client', async () => {
    const supabaseMock = makeSupabaseMock()
    const originalFrom = supabaseMock.from
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'parcours_steps') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'step-other',
              step_number: 1,
              title: 'Autre étape',
              description: 'Test',
              brief_template: null,
              parcours: { client_id: 'other-client-id' },
            },
            error: null,
          }),
        }
      }
      return originalFrom(table)
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await generateBrief('step-other')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne API_ERROR si Claude échoue', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)
    mockCreate.mockRejectedValue(new Error('Claude API down'))

    const result = await generateBrief('step-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('API_ERROR')
  })

  it('retourne API_ERROR si Claude retourne un brief vide', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '' }],
    })

    const result = await generateBrief('step-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('API_ERROR')
  })

  it('gère un profil communication inexistant (valeurs par défaut)', async () => {
    const supabaseMockNoProfile = makeSupabaseMock()
    const originalFrom = supabaseMockNoProfile.from
    supabaseMockNoProfile.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'communication_profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return originalFrom(table)
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMockNoProfile as never)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '# Brief sans profil' }],
    })

    const result = await generateBrief('step-1')

    expect(result.error).toBeNull()
    expect(result.data?.brief).toBeDefined()
  })

  it('inclut le template du brief dans le prompt si disponible', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '# Brief avec template' }],
    })

    await generateBrief('step-1')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('Template'),
          }),
        ]),
      })
    )
  })

  it('continue sans contexte si elio_conversations n\'existe pas', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '# Brief' }],
    })

    const result = await generateBrief('step-1')

    expect(result.error).toBeNull()
    expect(result.data?.brief).toBeDefined()
  })
})

// Need afterEach available
import { afterEach } from 'vitest'
