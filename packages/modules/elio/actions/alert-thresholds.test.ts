import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAlertThresholds, setAlertThresholds } from './alert-thresholds'
import { DEFAULT_ALERT_THRESHOLDS, type AlertThresholds } from '../types/alert-thresholds.types'

const ALERT_THRESHOLDS_KEY = 'elio_alert_thresholds' // constante locale pour les tests

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockMaybeSingle = vi.fn()
const mockGetUser = vi.fn()
const mockRpc = vi.fn()

const mockSupabase = {
  from: vi.fn(() => ({
    upsert: mockUpsert,
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: mockMaybeSingle,
      })),
    })),
  })),
  auth: { getUser: mockGetUser },
  rpc: mockRpc,
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const validThresholds: AlertThresholds = {
  stagnantParcoursDays: 10,
  silentClientDays: 21,
  oldValidationDays: 5,
}

function authAsOperator() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-mikl' } }, error: null })
  mockRpc.mockResolvedValue({ data: true, error: null })
}

describe('getAlertThresholds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les seuils stockés si valides', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: validThresholds }, error: null })
    const { data, error } = await getAlertThresholds()
    expect(error).toBeNull()
    expect(data).toEqual(validThresholds)
  })

  it('fallback défauts (7/14/3) si clé absente', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { data, error } = await getAlertThresholds()
    expect(error).toBeNull()
    expect(data).toEqual(DEFAULT_ALERT_THRESHOLDS)
    expect(data).toEqual({ stagnantParcoursDays: 7, silentClientDays: 14, oldValidationDays: 3 })
  })

  it('fallback défauts si la valeur stockée est invalide (schéma non conforme)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: { stagnantParcoursDays: 'sept' } }, error: null })
    const { data, error } = await getAlertThresholds()
    expect(error).toBeNull()
    expect(data).toEqual(DEFAULT_ALERT_THRESHOLDS)
  })

  it('fallback défauts si la lecture DB échoue (jamais bloquant)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB down' } })
    const { data, error } = await getAlertThresholds()
    expect(error).toBeNull()
    expect(data).toEqual(DEFAULT_ALERT_THRESHOLDS)
  })
})

describe('setAlertThresholds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sauvegarde les seuils dans system_config (opérateur)', async () => {
    authAsOperator()
    mockUpsert.mockResolvedValue({ error: null })

    const { data, error } = await setAlertThresholds(validThresholds)
    expect(error).toBeNull()
    expect(data).toEqual(validThresholds)
    expect(mockUpsert).toHaveBeenCalledWith(
      { key: ALERT_THRESHOLDS_KEY, value: validThresholds },
      { onConflict: 'key' },
    )
  })

  it('retourne VALIDATION_ERROR si un seuil est < 1', async () => {
    authAsOperator()
    const bad = { ...validThresholds, silentClientDays: 0 }
    const { data, error } = await setAlertThresholds(bad)
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si un seuil est décimal', async () => {
    authAsOperator()
    const bad = { ...validThresholds, oldValidationDays: 2.5 }
    const { data, error } = await setAlertThresholds(bad)
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
    const { data, error } = await setAlertThresholds(validThresholds)
    expect(data).toBeNull()
    expect(error!.code).toBe('UNAUTHORIZED')
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-client' } }, error: null })
    mockRpc.mockResolvedValue({ data: false, error: null })
    const { data, error } = await setAlertThresholds(validThresholds)
    expect(data).toBeNull()
    expect(error!.code).toBe('FORBIDDEN')
  })

  it("retourne DATABASE_ERROR si l'upsert échoue", async () => {
    authAsOperator()
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })
    const { data, error } = await setAlertThresholds(validThresholds)
    expect(data).toBeNull()
    expect(error!.code).toBe('DATABASE_ERROR')
  })
})
