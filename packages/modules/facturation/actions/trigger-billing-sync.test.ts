import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerBillingSync } from './trigger-billing-sync'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInvoke = vi.fn()
const mockRpc = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      rpc: mockRpc,
      functions: { invoke: mockInvoke },
    })
  ),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('triggerBillingSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si utilisateur non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await triggerBillingSync()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('retourne FORBIDDEN si utilisateur non opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    mockRpc.mockResolvedValue({ data: false, error: null })

    const result = await triggerBillingSync()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('invoque billing-sync sans clientId et retourne le nombre de synced', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })
    mockInvoke.mockResolvedValue({ data: { synced: 42, rateLimited: false }, error: null })

    const result = await triggerBillingSync()

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ synced: 42 })
    expect(mockInvoke).toHaveBeenCalledWith('billing-sync', { body: {} })
  })

  it('invoque billing-sync avec clientId et retourne SYNC_INVOKE_ERROR si échec', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    })

    const result = await triggerBillingSync('client-abc')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('SYNC_INVOKE_ERROR')
    expect(mockInvoke).toHaveBeenCalledWith('billing-sync', { body: { clientId: 'client-abc' } })
  })
})
