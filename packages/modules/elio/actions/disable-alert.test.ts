import { describe, it, expect, vi, beforeEach } from 'vitest'
import { disableAlert } from './disable-alert'
import { DEFAULT_ELIO_ALERTS_PREFERENCES } from '../config/default-alerts'
import type { ElioAlertsPreferences } from '../types/elio.types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSingle = vi.fn()

// Supabase mock simplifié
const mockFromSelect = {
  eq: vi.fn().mockReturnThis(),
  single: mockSingle,
}
const mockFromUpdate = {
  eq: vi.fn().mockResolvedValue({ error: null }),
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'client_configs') {
    return {
      select: vi.fn(() => mockFromSelect),
      update: vi.fn(() => mockFromUpdate),
    }
  }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

vi.mock('@monprojetpro/types', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    successResponse: (data: unknown) => ({ data, error: null }),
    errorResponse: (message: string, code: string, details?: unknown) => ({
      data: null,
      error: { message, code, details },
    }),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePrefsWithAlert(alertId: string, enabled = true): ElioAlertsPreferences {
  return {
    ...DEFAULT_ELIO_ALERTS_PREFERENCES,
    alerts: DEFAULT_ELIO_ALERTS_PREFERENCES.alerts.map((a) => ({
      ...a,
      enabled: a.id === alertId ? enabled : a.enabled,
    })),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('disableAlert (Story 8.9c — Task 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromUpdate.eq.mockResolvedValue({ error: null })
  })

  it('Task 8.4 — désactive l\'alerte correspondante par fuzzy match sur message', async () => {
    const prefs = makePrefsWithAlert('unpaid_subscriptions')
    mockSingle.mockResolvedValue({
      data: { elio_alerts_preferences: prefs },
      error: null,
    })

    const result = await disableAlert('client-uuid', 'cotisations impayées')

    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
  })

  it('Task 8.4 — désactive par correspondance sur l\'id de l\'alerte', async () => {
    const prefs = makePrefsWithAlert('missing_attendance_sheets')
    mockSingle.mockResolvedValue({
      data: { elio_alerts_preferences: prefs },
      error: null,
    })

    const result = await disableAlert('client-uuid', 'missing_attendance_sheets')

    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
  })

  it('Task 8.5 — retourne NOT_FOUND si aucune alerte correspondante', async () => {
    const prefs = makePrefsWithAlert('unpaid_subscriptions')
    mockSingle.mockResolvedValue({
      data: { elio_alerts_preferences: prefs },
      error: null,
    })

    const result = await disableAlert('client-uuid', 'sujet_inconnu_xyz')

    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.data).toBeNull()
  })

  it('retourne NOT_FOUND si config client introuvable', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('not found') })

    const result = await disableAlert('client-uuid', 'cotisations')

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne VALIDATION_ERROR si clientId vide', async () => {
    const result = await disableAlert('', 'cotisations')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si alertSubject vide', async () => {
    const result = await disableAlert('client-uuid', '')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne DB_ERROR si la sauvegarde échoue', async () => {
    const prefs = makePrefsWithAlert('unpaid_subscriptions')
    mockSingle.mockResolvedValue({
      data: { elio_alerts_preferences: prefs },
      error: null,
    })
    mockFromUpdate.eq.mockResolvedValue({ error: new Error('DB error') })

    const result = await disableAlert('client-uuid', 'cotisations')

    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('Task 8.4 — utilise les prefs par défaut si elio_alerts_preferences est null', async () => {
    mockSingle.mockResolvedValue({
      data: { elio_alerts_preferences: null },
      error: null,
    })

    const result = await disableAlert('client-uuid', 'cotisations impayées')

    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
  })
})
