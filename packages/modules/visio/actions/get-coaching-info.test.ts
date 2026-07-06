import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCoachingInfo } from './get-coaching-info'

const CLIENT_ID = '123e4567-e89b-12d3-a456-426614174000'

let userResponse: { data: { user: { id: string } | null }; error: unknown } = {
  data: { user: { id: 'auth-uid-1' } },
  error: null,
}
let configResponse: { data: unknown; error: unknown } = {
  data: { elio_tier: 'one_plus' },
  error: null,
}
let rpcResponse: { data: unknown; error: unknown } = { data: 2, error: null }
let nextSessionResponse: { data: unknown; error: unknown } = { data: null, error: null }

const mockRpc = vi.fn(async () => rpcResponse)

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => userResponse) },
    rpc: mockRpc,
    from: vi.fn((table: string) => {
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => configResponse) })),
          })),
        }
      }
      if (table === 'meetings') {
        // .select().eq().eq().eq().gte().order().limit().maybeSingle()
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          maybeSingle: vi.fn(async () => nextSessionResponse),
        }
        return chain
      }
      return {}
    }),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  userResponse = { data: { user: { id: 'auth-uid-1' } }, error: null }
  configResponse = { data: { elio_tier: 'one_plus' }, error: null }
  rpcResponse = { data: 2, error: null }
  nextSessionResponse = { data: null, error: null }
})

describe('getCoachingInfo', () => {
  it('retourne VALIDATION_ERROR sans clientId', async () => {
    const result = await getCoachingInfo('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne UNAUTHORIZED sans utilisateur', async () => {
    userResponse = { data: { user: null }, error: null }
    const result = await getCoachingInfo(CLIENT_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('client non One+ → état neutre sans appeler la RPC', async () => {
    configResponse = { data: { elio_tier: 'one' }, error: null }
    const result = await getCoachingInfo(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      elioTier: 'one',
      balance: 0,
      nextSessionAt: null,
      nextSessionTitle: null,
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('client One+ → solde + prochaine séance coaching', async () => {
    nextSessionResponse = {
      data: { title: 'Coaching mensuel', scheduled_at: '2099-01-01T10:00:00Z' },
      error: null,
    }

    const result = await getCoachingInfo(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      elioTier: 'one_plus',
      balance: 2,
      nextSessionAt: '2099-01-01T10:00:00Z',
      nextSessionTitle: 'Coaching mensuel',
    })
    expect(mockRpc).toHaveBeenCalledWith('get_coaching_balance', { p_client_id: CLIENT_ID })
  })

  it('RPC absente (migration non déployée) → fallback solde 0, pas d\'erreur', async () => {
    rpcResponse = { data: null, error: { message: 'function get_coaching_balance does not exist' } }

    const result = await getCoachingInfo(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data?.balance).toBe(0)
    expect(result.data?.elioTier).toBe('one_plus')
  })
})
