import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { resetElioConfig } from './reset-elio-config'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'

const makeDeleteMock = (deleteError: unknown = null) => ({
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
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: deleteError }),
        }),
      }
    }
    return {}
  }),
})

describe('resetElioConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supprime la config et retourne les valeurs par défaut', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeDeleteMock() as never)

    const result = await resetElioConfig()

    expect(result.error).toBeNull()
    expect(result.data).toEqual(DEFAULT_ELIO_CONFIG)
  })

  it('retourne UNAUTHORIZED si utilisateur non connecté', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const result = await resetElioConfig()

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

    const result = await resetElioConfig()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne DB_ERROR si la suppression échoue', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeDeleteMock({ message: 'delete failed' }) as never
    )

    const result = await resetElioConfig()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
