import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getElioConfigHistory } from './get-elio-config-history'

// ─── Mock Supabase ───────────────────────────────────────────
const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}))
// ─────────────────────────────────────────────────────────────

describe('getElioConfigHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne VALIDATION_ERROR si clientId vide', async () => {
    const result = await getElioConfigHistory('')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne les entrées triées en camelCase', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'hist-1',
          client_id: 'client-1',
          field_changed: 'elio_config',
          old_value: { model: 'claude-haiku-4-20250122' },
          new_value: { model: 'claude-sonnet-4-20250514' },
          changed_at: '2026-03-01T10:00:00Z',
          changed_by: 'user-1',
        },
      ],
      error: null,
    })

    const result = await getElioConfigHistory('client-1')
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].clientId).toBe('client-1')
    expect(result.data?.[0].fieldChanged).toBe('elio_config')
    expect(result.data?.[0].changedAt).toBe('2026-03-01T10:00:00Z')
  })

  it('retourne un tableau vide si aucun historique', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    const result = await getElioConfigHistory('client-1')
    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('retourne DB_ERROR en cas d\'erreur DB', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    const result = await getElioConfigHistory('client-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
