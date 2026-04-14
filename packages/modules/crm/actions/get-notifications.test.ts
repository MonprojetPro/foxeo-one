import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
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

describe('getNotifications Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return notifications transformed to camelCase', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-operator-id' } },
      error: null,
    })

    mockRange.mockResolvedValue({
      data: [
        {
          id: 'notif-1',
          recipient_type: 'operator',
          recipient_id: 'test-operator-id',
          type: 'inactivity_alert',
          title: 'Client inactif',
          body: 'Test message',
          link: null,
          read_at: null,
          created_at: '2026-02-17T10:00:00Z',
        },
      ],
      error: null,
    })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]).toHaveProperty('recipientType')
    expect(result.data?.[0]).toHaveProperty('recipientId')
    expect(result.data?.[0]).toHaveProperty('body')
    expect(result.data?.[0]).toHaveProperty('createdAt')
    expect(result.data?.[0]).not.toHaveProperty('recipient_type')
    expect(result.data?.[0]).not.toHaveProperty('recipient_id')
  })

  it('should return empty array when no notifications', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-operator-id' } },
      error: null,
    })

    mockRange.mockResolvedValue({
      data: [],
      error: null,
    })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should return DATABASE_ERROR on Supabase failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-operator-id' } },
      error: null,
    })

    mockRange.mockResolvedValue({
      data: null,
      error: { message: 'Query failed' },
    })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { getNotifications } = await import('./get-notifications')
    const result = await getNotifications()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
