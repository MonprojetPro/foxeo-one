import { describe, it, expect, vi, beforeEach } from 'vitest'

const validClientUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock chain: .from('clients').update({...}).eq('id', ...).is('hub_seen_at', null)
const mockIs = vi.fn()
const mockEq = vi.fn(() => ({ is: mockIs }))
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ update: mockUpdate }))
const mockGetUser = vi.fn()
const mockRpc = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
}))

describe('markClientSeen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })
    mockIs.mockResolvedValue({ error: null })
  })

  it('marks client as seen and returns null data on success', async () => {
    const { markClientSeen } = await import('./mark-client-seen')
    const result = await markClientSeen(validClientUuid)

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ hub_seen_at: expect.any(String) }))
    expect(mockEq).toHaveBeenCalledWith('id', validClientUuid)
    expect(mockIs).toHaveBeenCalledWith('hub_seen_at', null)
  })

  it('returns UNAUTHORIZED when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { markClientSeen } = await import('./mark-client-seen')
    const result = await markClientSeen(validClientUuid)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when not an operator', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    const { markClientSeen } = await import('./mark-client-seen')
    const result = await markClientSeen(validClientUuid)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns DATABASE_ERROR on supabase failure', async () => {
    mockIs.mockResolvedValue({ error: { message: 'DB error' } })

    const { markClientSeen } = await import('./mark-client-seen')
    const result = await markClientSeen(validClientUuid)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('is idempotent — .is(hub_seen_at, null) ensures already-seen clients are not re-updated', async () => {
    const { markClientSeen } = await import('./mark-client-seen')
    await markClientSeen(validClientUuid)

    expect(mockIs).toHaveBeenCalledWith('hub_seen_at', null)
  })
})
