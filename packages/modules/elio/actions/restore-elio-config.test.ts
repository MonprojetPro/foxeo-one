import { describe, it, expect, vi, beforeEach } from 'vitest'
import { restoreElioConfig } from './restore-elio-config'

// ─── Mock Supabase ───────────────────────────────────────────
const mockHistorySingle = vi.fn()
const mockHistoryEqInner = vi.fn(() => ({ single: mockHistorySingle }))
const mockHistoryEqOuter = vi.fn(() => ({ eq: mockHistoryEqInner }))
const mockHistorySelect = vi.fn(() => ({ eq: mockHistoryEqOuter }))

const mockConfigSingle = vi.fn()
const mockConfigSelectInner = vi.fn(() => ({ single: mockConfigSingle }))
const mockConfigEq = vi.fn(() => ({ select: mockConfigSelectInner }))
const mockConfigUpdate = vi.fn(() => ({ eq: mockConfigEq }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'elio_config_history') {
        return { select: mockHistorySelect }
      }
      if (table === 'elio_configs') {
        return { update: mockConfigUpdate }
      }
      return {}
    }),
  })),
}))
// ─────────────────────────────────────────────────────────────

const OLD_CONFIG = {
  model: 'claude-haiku-4-20250122',
  temperature: 0.5,
  max_tokens: 1000,
  custom_instructions: null,
  enabled_features: {},
}

describe('restoreElioConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne VALIDATION_ERROR si clientId vide', async () => {
    const result = await restoreElioConfig('', 'hist-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si historyEntryId vide', async () => {
    const result = await restoreElioConfig('client-1', '')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si l\'entrée d\'historique n\'existe pas', async () => {
    mockHistorySingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

    const result = await restoreElioConfig('client-1', 'hist-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne VALIDATION_ERROR si old_value est null', async () => {
    mockHistorySingle.mockResolvedValueOnce({
      data: { old_value: null, client_id: 'client-1' },
      error: null,
    })

    const result = await restoreElioConfig('client-1', 'hist-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('restaure la config avec succès et retourne la config restaurée', async () => {
    mockHistorySingle.mockResolvedValueOnce({
      data: { old_value: OLD_CONFIG, client_id: 'client-1' },
      error: null,
    })
    mockConfigSingle.mockResolvedValueOnce({
      data: {
        id: 'config-1',
        client_id: 'client-1',
        ...OLD_CONFIG,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-03-02T10:00:00Z',
      },
      error: null,
    })

    const result = await restoreElioConfig('client-1', 'hist-1')
    expect(result.error).toBeNull()
    expect(result.data?.model).toBe('claude-haiku-4-20250122')
    expect(result.data?.temperature).toBe(0.5)
  })

  it('retourne DB_ERROR si la mise à jour échoue', async () => {
    mockHistorySingle.mockResolvedValueOnce({
      data: { old_value: OLD_CONFIG, client_id: 'client-1' },
      error: null,
    })
    mockConfigSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    })

    const result = await restoreElioConfig('client-1', 'hist-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
