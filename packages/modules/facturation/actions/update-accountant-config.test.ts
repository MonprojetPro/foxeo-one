import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateAccountantConfig, getAccountantConfig } from './update-accountant-config'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockIn = vi.fn()
const mockRpc = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: vi.fn(() => ({ in: mockIn })),
    })),
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockOperator() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null })
  mockRpc.mockResolvedValue({ data: true, error: null })
}

function mockUnauthorized() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
}

function mockNonOperator() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  mockRpc.mockResolvedValue({ data: false, error: null })
}

// ── Tests updateAccountantConfig ──────────────────────────────────────────────

describe('updateAccountantConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockUnauthorized()
    const result = await updateAccountantConfig('comptable@cabinet.fr', false)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    mockNonOperator()
    const result = await updateAccountantConfig('comptable@cabinet.fr', false)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('sauvegarde email et flag sync avec succès', async () => {
    mockOperator()
    mockUpsert.mockResolvedValue({ error: null })

    const result = await updateAccountantConfig('comptable@cabinet.fr', true)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ saved: true })
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ key: 'accountant_email' }),
        expect.objectContaining({ key: 'accountant_email_sync_enabled', value: 'true' }),
      ]),
      { onConflict: 'key' }
    )
  })

  it('retourne DB_ERROR si upsert échoue', async () => {
    mockOperator()
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await updateAccountantConfig('comptable@cabinet.fr', false)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

// ── Tests getAccountantConfig ──────────────────────────────────────────────────

describe('getAccountantConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne email et flag sync depuis system_config', async () => {
    mockOperator()
    mockIn.mockResolvedValue({
      data: [
        { key: 'accountant_email', value: '"comptable@cabinet.fr"' },
        { key: 'accountant_email_sync_enabled', value: 'true' },
      ],
      error: null,
    })

    const result = await getAccountantConfig()
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      accountantEmail: 'comptable@cabinet.fr',
      syncEnabled: true,
    })
  })

  it('retourne valeurs par défaut si config absente', async () => {
    mockOperator()
    mockIn.mockResolvedValue({ data: [], error: null })

    const result = await getAccountantConfig()
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ accountantEmail: '', syncEnabled: false })
  })
})
