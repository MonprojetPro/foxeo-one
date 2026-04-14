import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getElioConfig } from './get-elio-config'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'

const makeSupabaseMock = (options: {
  user?: { id: string } | null
  client?: { id: string } | null
  config?: Record<string, unknown> | null
  configError?: { message: string } | null
} = {}) => {
  const {
    user = { id: 'user-1' },
    client = { id: 'client-1' },
    config = null,
    configError = null,
  } = options

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'not found' },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: client,
            error: client ? null : { message: 'not found' },
          }),
        }
      }
      if (table === 'elio_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: config,
            error: configError,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  }
}

describe('getElioConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne les defaults si aucune config en DB', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await getElioConfig()

    expect(result.error).toBeNull()
    expect(result.data).toEqual(DEFAULT_ELIO_CONFIG)
  })

  it('retourne la config stockée si elle existe', async () => {
    const dbConfig = {
      id: 'config-1',
      client_id: 'client-1',
      model: 'claude-haiku-4-20250122',
      temperature: 0.5,
      max_tokens: 2000,
      custom_instructions: 'Utilise des analogies',
      enabled_features: { code_generation: true },
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({ config: dbConfig }) as never
    )

    const result = await getElioConfig()

    expect(result.error).toBeNull()
    expect(result.data?.model).toBe('claude-haiku-4-20250122')
    expect(result.data?.temperature).toBe(0.5)
    expect(result.data?.maxTokens).toBe(2000)
    expect(result.data?.customInstructions).toBe('Utilise des analogies')
    expect(result.data?.enabledFeatures).toEqual({ code_generation: true })
  })

  it('retourne UNAUTHORIZED si utilisateur non connecté', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({ user: null }) as never
    )

    const result = await getElioConfig()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne NOT_FOUND si client non trouvé', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({ client: null }) as never
    )

    const result = await getElioConfig()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('skip auth quand clientId est fourni', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock() as never
    )

    const result = await getElioConfig('client-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual(DEFAULT_ELIO_CONFIG)
  })

  it('retourne DB_ERROR si erreur DB sur elio_configs', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({ configError: { message: 'connection failed' } }) as never
    )

    const result = await getElioConfig()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
