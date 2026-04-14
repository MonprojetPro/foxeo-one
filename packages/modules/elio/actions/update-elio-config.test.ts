import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { updateElioConfig } from './update-elio-config'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

const makeUpsertMock = (config: Record<string, unknown> | null = null, error: unknown = null) => {
  const selectMock = vi.fn().mockReturnThis()
  const singleMock = vi.fn().mockResolvedValue({ data: config, error })
  const upsertMock = vi.fn().mockReturnValue({
    select: selectMock,
    single: singleMock,
  })
  selectMock.mockReturnValue({ single: singleMock })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'client-1' }, error: null }),
        }
      }
      if (table === 'elio_configs') {
        return { upsert: upsertMock }
      }
      return {}
    }),
  }
}

describe('updateElioConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('met à jour la config et la retourne', async () => {
    const savedConfig = {
      id: 'config-1',
      client_id: 'client-1',
      model: 'claude-haiku-4-20250122',
      temperature: 0.7,
      max_tokens: 1000,
      custom_instructions: 'Instructions test',
      enabled_features: { code_generation: true },
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeUpsertMock(savedConfig) as never
    )

    const result = await updateElioConfig({
      model: 'claude-haiku-4-20250122',
      temperature: 0.7,
      maxTokens: 1000,
      customInstructions: 'Instructions test',
      enabledFeatures: { code_generation: true },
    })

    expect(result.error).toBeNull()
    expect(result.data?.model).toBe('claude-haiku-4-20250122')
    expect(result.data?.temperature).toBe(0.7)
    expect(result.data?.maxTokens).toBe(1000)
    expect(result.data?.customInstructions).toBe('Instructions test')
  })

  it('retourne VALIDATION_ERROR si température hors limites', async () => {
    const result = await updateElioConfig({
      model: 'claude-sonnet-4-20250514',
      temperature: 999,
      maxTokens: 1500,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si modèle invalide', async () => {
    const result = await updateElioConfig({
      model: 'fake-model',
      temperature: 1.0,
      maxTokens: 1500,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si maxTokens hors limites', async () => {
    const result = await updateElioConfig({
      model: 'claude-sonnet-4-20250514',
      temperature: 1.0,
      maxTokens: 99,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne UNAUTHORIZED si utilisateur non connecté', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const result = await updateElioConfig({
      model: 'claude-sonnet-4-20250514',
      temperature: 1.0,
      maxTokens: 1500,
    })

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
      })),
    } as never)

    const result = await updateElioConfig({
      model: 'claude-sonnet-4-20250514',
      temperature: 1.0,
      maxTokens: 1500,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne DB_ERROR si upsert échoue', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeUpsertMock(null, { message: 'upsert failed' }) as never
    )

    const result = await updateElioConfig({
      model: 'claude-sonnet-4-20250514',
      temperature: 1.0,
      maxTokens: 1500,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
