import { describe, it, expect, vi, beforeEach } from 'vitest'

const testNotifId = '550e8400-e29b-41d4-a716-446655440001'

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

describe('markAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return VALIDATION_ERROR for invalid UUID', async () => {
    const { markAsRead } = await import('./mark-as-read')
    const result = await markAsRead({ notificationId: 'bad-id' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'err' } })

    const { markAsRead } = await import('./mark-as-read')
    const result = await markAsRead({ notificationId: testNotifId })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should mark notification as read and return its ID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({ data: { id: testNotifId }, error: null })

    const { markAsRead } = await import('./mark-as-read')
    const result = await markAsRead({ notificationId: testNotifId })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ id: testNotifId })
  })

  it('should return NOT_FOUND when notification does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({ data: null, error: null })

    const { markAsRead } = await import('./mark-as-read')
    const result = await markAsRead({ notificationId: testNotifId })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DATABASE_ERROR on failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

    const { markAsRead } = await import('./mark-as-read')
    const result = await markAsRead({ notificationId: testNotifId })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
