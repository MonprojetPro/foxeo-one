import { describe, it, expect, vi, beforeEach } from 'vitest'

// The chain is: from().select().eq().is() → { count, error }
const mockIs = vi.fn()
const mockEq = vi.fn(() => ({ is: mockIs }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('getUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'err' } })

    const { getUnreadCount } = await import('./get-unread-count')
    const result = await getUnreadCount('user-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return FORBIDDEN when recipientId does not match user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { getUnreadCount } = await import('./get-unread-count')
    const result = await getUnreadCount('other-user')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('should return the unread count', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockIs.mockResolvedValue({ count: 5, error: null })

    const { getUnreadCount } = await import('./get-unread-count')
    const result = await getUnreadCount('user-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ count: 5 })
  })

  it('should return 0 when no unread notifications', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockIs.mockResolvedValue({ count: 0, error: null })

    const { getUnreadCount } = await import('./get-unread-count')
    const result = await getUnreadCount('user-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ count: 0 })
  })

  it('should return DATABASE_ERROR on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockIs.mockResolvedValue({ count: null, error: { message: 'Query failed' } })

    const { getUnreadCount } = await import('./get-unread-count')
    const result = await getUnreadCount('user-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'err' } })

    const { getUnreadCount } = await import('./get-unread-count')
    const result = await getUnreadCount('user-1')

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
