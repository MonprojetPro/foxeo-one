import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRange = vi.fn()
const mockOrder = vi.fn(() => ({ range: mockRange }))
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('getNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  const validUserId = '550e8400-e29b-41d4-a716-446655440001'

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications({ recipientId: validUserId, offset: 0, limit: 20 })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for invalid recipientId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validUserId } }, error: null })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications({ recipientId: 'bad-id', offset: 0, limit: 20 })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return FORBIDDEN when recipientId does not match user', async () => {
    const otherUserId = '550e8400-e29b-41d4-a716-446655440099'
    mockGetUser.mockResolvedValue({ data: { user: { id: validUserId } }, error: null })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications({ recipientId: otherUserId, offset: 0, limit: 20 })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('should return notifications transformed to camelCase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validUserId } }, error: null })
    mockRange.mockResolvedValue({
      data: [{
        id: 'n-1',
        recipient_type: 'operator',
        recipient_id: validUserId,
        type: 'message',
        title: 'New message',
        body: 'Hello',
        link: '/chat',
        read_at: null,
        created_at: '2026-02-17T10:00:00Z',
      }],
      error: null,
    })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications({ recipientId: validUserId, offset: 0, limit: 20 })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]).toHaveProperty('recipientType', 'operator')
    expect(result.data?.[0]).toHaveProperty('recipientId', validUserId)
    expect(result.data?.[0]).toHaveProperty('body', 'Hello')
    expect(result.data?.[0]).toHaveProperty('link', '/chat')
    expect(result.data?.[0]).toHaveProperty('readAt', null)
    expect(result.data?.[0]).not.toHaveProperty('recipient_type')
  })

  it('should return empty array when no notifications', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validUserId } }, error: null })
    mockRange.mockResolvedValue({ data: [], error: null })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications({ recipientId: validUserId, offset: 0, limit: 20 })

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should return DATABASE_ERROR on Supabase failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validUserId } }, error: null })
    mockRange.mockResolvedValue({ data: null, error: { message: 'Query failed' } })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications({ recipientId: validUserId, offset: 0, limit: 20 })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'err' } })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications({ recipientId: validUserId, offset: 0, limit: 20 })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
