import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setTokenBudgetAlert, getTokenBudgetAlert } from './set-token-budget-alert'

const BUDGET_ALERT_KEY = 'elio_monthly_budget_eur' // constante locale pour les tests

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockMaybeSingle = vi.fn()

const mockSupabase = {
  from: vi.fn(() => ({
    upsert: mockUpsert,
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: mockMaybeSingle,
      })),
    })),
  })),
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

describe('setTokenBudgetAlert', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sauvegarde le budget dans system_config', async () => {
    const { data, error } = await setTokenBudgetAlert(50)
    expect(error).toBeNull()
    expect(data!.budgetEur).toBe(50)
    expect(mockUpsert).toHaveBeenCalledWith(
      { key: BUDGET_ALERT_KEY, value: 50 },
      { onConflict: 'key' },
    )
  })

  it('retourne VALIDATION_ERROR si budget <= 0', async () => {
    const { data, error } = await setTokenBudgetAlert(0)
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si budget négatif', async () => {
    const { data, error } = await setTokenBudgetAlert(-10)
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne DATABASE_ERROR si l\'upsert échoue', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'DB error' } })
    const { data, error } = await setTokenBudgetAlert(50)
    expect(data).toBeNull()
    expect(error!.code).toBe('DATABASE_ERROR')
  })
})

describe('getTokenBudgetAlert', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne le budget configuré', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: 50 }, error: null })
    const { data, error } = await getTokenBudgetAlert()
    expect(error).toBeNull()
    expect(data!.budgetEur).toBe(50)
  })

  it('retourne null si non configuré', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { data, error } = await getTokenBudgetAlert()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })
})
