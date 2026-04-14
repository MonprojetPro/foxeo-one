import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkElioTierAccess } from './execute-action'

const mockMaybySingle = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybySingle,
        })),
      })),
    })),
  })),
}))

describe('checkElioTierAccess (Story 9.4 — AC#5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne success si elio_tier = one_plus', async () => {
    mockMaybySingle.mockResolvedValue({ data: { elio_tier: 'one_plus' }, error: null })

    const result = await checkElioTierAccess('client-1')
    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
  })

  it('retourne TIER_INSUFFICIENT si elio_tier = one', async () => {
    mockMaybySingle.mockResolvedValue({ data: { elio_tier: 'one' }, error: null })

    const result = await checkElioTierAccess('client-1')
    expect(result.error?.code).toBe('TIER_INSUFFICIENT')
    expect(result.error?.message).toContain('One+')
    expect(result.data).toBeNull()
  })

  it('retourne TIER_INSUFFICIENT si elio_tier = null (défaut = one)', async () => {
    mockMaybySingle.mockResolvedValue({ data: { elio_tier: null }, error: null })

    const result = await checkElioTierAccess('client-1')
    expect(result.error?.code).toBe('TIER_INSUFFICIENT')
  })

  it('retourne TIER_INSUFFICIENT si config absente', async () => {
    mockMaybySingle.mockResolvedValue({ data: null, error: null })

    const result = await checkElioTierAccess('client-1')
    expect(result.error?.code).toBe('TIER_INSUFFICIENT')
  })

  it('retourne INVALID_INPUT si clientId vide', async () => {
    const result = await checkElioTierAccess('')
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('retourne DATABASE_ERROR si supabase échoue', async () => {
    mockMaybySingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await checkElioTierAccess('client-1')
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
