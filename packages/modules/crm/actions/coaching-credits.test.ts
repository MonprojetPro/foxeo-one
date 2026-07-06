import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCoachingCreditsInfo,
  setCoachingMonthlyCredits,
  addCoachingCredits,
} from './coaching-credits'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const CLIENT_ID = '123e4567-e89b-12d3-a456-426614174000'
const OPERATOR_ID = '223e4567-e89b-12d3-a456-426614174001'

// Refs mutables pilotant les mocks
let userResponse: { data: { user: { id: string } | null }; error: unknown } = {
  data: { user: { id: 'auth-uid-1' } },
  error: null,
}
let operatorResponse: { data: unknown; error: unknown } = { data: { id: OPERATOR_ID }, error: null }
let clientResponse: { data: unknown; error: unknown } = { data: { id: CLIENT_ID }, error: null }
let rpcResponse: { data: unknown; error: unknown } = { data: 3, error: null }
let configResponse: { data: unknown; error: unknown } = {
  data: { coaching_monthly_credits: 1, elio_tier: 'one_plus' },
  error: null,
}
let ledgerSelectResponse: { data: unknown; error: unknown } = { data: [], error: null }
let configUpdateResult: { error: unknown } = { error: null }
let ledgerInsertResult: { error: unknown } = { error: null }

const mockRpc = vi.fn(async () => rpcResponse)
const mockConfigUpdate = vi.fn(() => ({ eq: vi.fn(async () => configUpdateResult) }))
const mockLedgerInsert = vi.fn(async () => ledgerInsertResult)
const mockActivityInsert = vi.fn(async () => ({ error: null }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => userResponse) },
    rpc: mockRpc,
    from: vi.fn((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: vi.fn(async () => operatorResponse) })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: vi.fn(async () => clientResponse) })),
            })),
          })),
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => configResponse) })),
          })),
          update: mockConfigUpdate,
        }
      }
      if (table === 'coaching_credit_ledger') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ limit: vi.fn(async () => ledgerSelectResponse) })),
            })),
          })),
          insert: mockLedgerInsert,
        }
      }
      if (table === 'activity_logs') {
        return { insert: mockActivityInsert }
      }
      return {}
    }),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  userResponse = { data: { user: { id: 'auth-uid-1' } }, error: null }
  operatorResponse = { data: { id: OPERATOR_ID }, error: null }
  clientResponse = { data: { id: CLIENT_ID }, error: null }
  rpcResponse = { data: 3, error: null }
  configResponse = { data: { coaching_monthly_credits: 1, elio_tier: 'one_plus' }, error: null }
  ledgerSelectResponse = { data: [], error: null }
  configUpdateResult = { error: null }
  ledgerInsertResult = { error: null }
})

describe('getCoachingCreditsInfo', () => {
  it('retourne INVALID_INPUT si clientId invalide', async () => {
    const result = await getCoachingCreditsInfo('not-a-uuid')
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(result.data).toBeNull()
  })

  it('retourne UNAUTHORIZED sans utilisateur', async () => {
    userResponse = { data: { user: null }, error: null }
    const result = await getCoachingCreditsInfo(CLIENT_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne NOT_FOUND si le client n\'appartient pas à l\'opérateur', async () => {
    clientResponse = { data: null, error: { message: 'not found' } }
    const result = await getCoachingCreditsInfo(CLIENT_ID)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('agrège solde + crédits mensuels + historique (camelCase)', async () => {
    ledgerSelectResponse = {
      data: [
        {
          id: 'l1',
          delta: -1,
          reason: 'session_booked',
          meeting_id: 'm1',
          note: null,
          created_by: 'calcom-webhook',
          created_at: '2026-07-01T10:00:00Z',
        },
      ],
      error: null,
    }

    const result = await getCoachingCreditsInfo(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      balance: 3,
      monthlyCredits: 1,
      elioTier: 'one_plus',
      recentLedger: [
        {
          id: 'l1',
          delta: -1,
          reason: 'session_booked',
          meetingId: 'm1',
          note: null,
          createdBy: 'calcom-webhook',
          createdAt: '2026-07-01T10:00:00Z',
        },
      ],
    })
    expect(mockRpc).toHaveBeenCalledWith('get_coaching_balance', { p_client_id: CLIENT_ID })
  })

  it('retourne DATABASE_ERROR si la RPC solde échoue', async () => {
    rpcResponse = { data: null, error: { message: 'function does not exist' } }
    const result = await getCoachingCreditsInfo(CLIENT_ID)
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})

describe('setCoachingMonthlyCredits', () => {
  it('rejette une valeur hors bornes', async () => {
    const result = await setCoachingMonthlyCredits(CLIENT_ID, 99)
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockConfigUpdate).not.toHaveBeenCalled()
  })

  it('rejette un non-entier', async () => {
    const result = await setCoachingMonthlyCredits(CLIENT_ID, 1.5)
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('met à jour client_configs.coaching_monthly_credits', async () => {
    const result = await setCoachingMonthlyCredits(CLIENT_ID, 2)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ monthlyCredits: 2 })
    expect(mockConfigUpdate).toHaveBeenCalledWith({ coaching_monthly_credits: 2 })
  })

  it('retourne DATABASE_ERROR si l\'update échoue', async () => {
    configUpdateResult = { error: { message: 'boom' } }
    const result = await setCoachingMonthlyCredits(CLIENT_ID, 2)
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})

describe('addCoachingCredits', () => {
  it('rejette 0 crédit', async () => {
    const result = await addCoachingCredits(CLIENT_ID, 0)
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockLedgerInsert).not.toHaveBeenCalled()
  })

  it('insère un mouvement manual_adjust et retourne le nouveau solde', async () => {
    rpcResponse = { data: 5, error: null }
    const result = await addCoachingCredits(CLIENT_ID, 2, 'Geste commercial')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ balance: 5 })
    expect(mockLedgerInsert).toHaveBeenCalledWith({
      client_id: CLIENT_ID,
      delta: 2,
      reason: 'manual_adjust',
      note: 'Geste commercial',
      created_by: `operator:${OPERATOR_ID}`,
    })
  })

  it('accepte un retrait (delta négatif)', async () => {
    const result = await addCoachingCredits(CLIENT_ID, -1)
    expect(result.error).toBeNull()
    expect(mockLedgerInsert).toHaveBeenCalledWith(
      expect.objectContaining({ delta: -1, reason: 'manual_adjust', note: null })
    )
  })

  it('retourne DATABASE_ERROR si l\'insert ledger échoue', async () => {
    ledgerInsertResult = { error: { message: 'rls' } }
    const result = await addCoachingCredits(CLIENT_ID, 1)
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
