import { describe, it, expect, vi, beforeEach } from 'vitest'
import { changeClientTier } from './change-tier'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const CLIENT_ID = '123e4567-e89b-12d3-a456-426614174000'
const OPERATOR_ID = '223e4567-e89b-12d3-a456-426614174001'
const CONFIG_ID = '323e4567-e89b-12d3-a456-426614174002'

// Shared mutable refs for mock control
let operatorResponse: { data: unknown; error: unknown } = { data: { id: OPERATOR_ID }, error: null }
let clientResponse: { data: unknown; error: unknown } = { data: { id: CLIENT_ID, operator_id: OPERATOR_ID, name: 'Alice Dupont' }, error: null }
let configResponse: { data: unknown; error: unknown } = {
  data: { id: CONFIG_ID, client_id: CLIENT_ID, subscription_tier: 'essentiel', elio_tier: 'one', elio_proactive_alerts: false },
  error: null,
}
let updateResult: { error: unknown } = { error: null }
let insertResult: { error: unknown } = { error: null }

const mockUpdate = vi.fn()
const mockInsert = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'auth-uid-1' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => operatorResponse),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => clientResponse),
              })),
            })),
          })),
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => configResponse),
            })),
          })),
          update: mockUpdate,
        }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return {}
    }),
  })),
}))

describe('changeClientTier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset defaults
    operatorResponse = { data: { id: OPERATOR_ID }, error: null }
    clientResponse = { data: { id: CLIENT_ID, operator_id: OPERATOR_ID, name: 'Alice Dupont' }, error: null }
    configResponse = {
      data: { id: CONFIG_ID, client_id: CLIENT_ID, subscription_tier: 'essentiel', elio_tier: 'one', elio_proactive_alerts: false },
      error: null,
    }
    updateResult = { error: null }
    insertResult = { error: null }

    mockUpdate.mockReturnValue({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => updateResult),
      })),
    })
    mockInsert.mockResolvedValue(insertResult)
  })

  describe('Validation', () => {
    it('retourne INVALID_INPUT si clientId invalide', async () => {
      const result = await changeClientTier({ clientId: 'not-a-uuid', newTier: 'essentiel' })
      expect(result.error?.code).toBe('INVALID_INPUT')
      expect(result.data).toBeNull()
    })

    it('retourne INVALID_INPUT si newTier invalide', async () => {
      const result = await changeClientTier({ clientId: CLIENT_ID, newTier: 'invalid' as 'base' })
      expect(result.error?.code).toBe('INVALID_INPUT')
    })
  })

  describe('TIER_UNCHANGED', () => {
    it('retourne TIER_UNCHANGED si même tier', async () => {
      configResponse = {
        data: { id: CONFIG_ID, client_id: CLIENT_ID, subscription_tier: 'essentiel', elio_tier: 'one', elio_proactive_alerts: false },
        error: null,
      }

      const result = await changeClientTier({ clientId: CLIENT_ID, newTier: 'essentiel' })
      expect(result.error?.code).toBe('TIER_UNCHANGED')
      expect(result.data).toBeNull()
    })
  })

  describe('Changement standard', () => {
    it('met à jour subscription_tier + elio_tier + tier_changed_at dans client_configs', async () => {
      configResponse = {
        data: { id: CONFIG_ID, client_id: CLIENT_ID, subscription_tier: 'essentiel', elio_tier: 'one', elio_proactive_alerts: false },
        error: null,
      }

      const result = await changeClientTier({ clientId: CLIENT_ID, newTier: 'agentique' })

      expect(result.error).toBeNull()
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_tier: 'agentique',
          elio_tier: 'one_plus',
          pending_billing_update: true,
        })
      )
    })

    it('crée un activity_log avec oldTier et newTier', async () => {
      configResponse = {
        data: { id: CONFIG_ID, client_id: CLIENT_ID, subscription_tier: 'base', elio_tier: null, elio_proactive_alerts: false },
        error: null,
      }

      await changeClientTier({ clientId: CLIENT_ID, newTier: 'essentiel' })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tier_changed',
          entity_id: CLIENT_ID,
          metadata: expect.objectContaining({
            oldTier: 'base',
            newTier: 'essentiel',
          }),
        })
      )
    })
  })

  describe('Upgrade vers One+', () => {
    it('active elio_proactive_alerts lors d\'un upgrade vers agentique', async () => {
      configResponse = {
        data: { id: CONFIG_ID, client_id: CLIENT_ID, subscription_tier: 'essentiel', elio_tier: 'one', elio_proactive_alerts: false },
        error: null,
      }

      await changeClientTier({ clientId: CLIENT_ID, newTier: 'agentique' })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          elio_proactive_alerts: true,
          elio_tier: 'one_plus',
        })
      )
    })
  })

  describe('Downgrade depuis One+', () => {
    it('désactive elio_proactive_alerts lors d\'un downgrade depuis agentique', async () => {
      configResponse = {
        data: { id: CONFIG_ID, client_id: CLIENT_ID, subscription_tier: 'agentique', elio_tier: 'one_plus', elio_proactive_alerts: true },
        error: null,
      }

      await changeClientTier({ clientId: CLIENT_ID, newTier: 'essentiel' })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          elio_proactive_alerts: false,
          elio_tier: 'one',
        })
      )
    })
  })
})
