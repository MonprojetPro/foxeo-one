import { describe, it, expect, vi, beforeEach } from 'vitest'

// Chain: from().update().eq().is() → { error }
const mockIs = vi.fn()
const mockEq = vi.fn(() => ({ is: mockIs }))
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ update: mockUpdate }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('markAllAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'err' } })

    const { markAllAsRead } = await import('./mark-all-as-read')
    const result = await markAllAsRead('user-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return FORBIDDEN when recipientId does not match user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { markAllAsRead } = await import('./mark-all-as-read')
    const result = await markAllAsRead('other-user')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('should mark all as read successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockIs.mockResolvedValue({ error: null })

    const { markAllAsRead } = await import('./mark-all-as-read')
    const result = await markAllAsRead('user-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should return DATABASE_ERROR on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockIs.mockResolvedValue({ error: { message: 'Update failed' } })

    const { markAllAsRead } = await import('./mark-all-as-read')
    const result = await markAllAsRead('user-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'err' } })

    const { markAllAsRead } = await import('./mark-all-as-read')
    const result = await markAllAsRead('user-1')

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
