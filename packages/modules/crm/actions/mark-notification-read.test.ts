import { describe, it, expect, vi, beforeEach } from 'vitest'

const testNotifId = '550e8400-e29b-41d4-a716-446655440001'

// Mock Supabase
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockEqNotif = vi.fn(() => ({ select: mockSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockEqNotif }))
const mockFrom = vi.fn(() => ({ update: mockUpdate }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('markNotificationRead Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return INVALID_INPUT for invalid notification ID', async () => {
    const { markNotificationRead } = await import('./mark-notification-read')
    const result = await markNotificationRead('not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return INVALID_INPUT for empty string', async () => {
    const { markNotificationRead } = await import('./mark-notification-read')
    const result = await markNotificationRead('')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { markNotificationRead } = await import('./mark-notification-read')
    const result = await markNotificationRead(testNotifId)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should mark notification as read and return its ID', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-operator-id' } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: { id: testNotifId },
      error: null,
    })

    const { markNotificationRead } = await import('./mark-notification-read')
    const result = await markNotificationRead(testNotifId)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ id: testNotifId })
  })

  it('should return NOT_FOUND when notification does not exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-operator-id' } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: null,
      error: null,
    })

    const { markNotificationRead } = await import('./mark-notification-read')
    const result = await markNotificationRead(testNotifId)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DATABASE_ERROR on Supabase failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-operator-id' } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    })

    const { markNotificationRead } = await import('./mark-notification-read')
    const result = await markNotificationRead(testNotifId)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { markNotificationRead } = await import('./mark-notification-read')
    const result = await markNotificationRead(testNotifId)

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
