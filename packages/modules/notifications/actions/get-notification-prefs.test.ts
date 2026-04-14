import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PREFERENCE_NOTIFICATION_TYPES } from '../types/notification-prefs.types'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('getNotificationPrefs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'err' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
    })

    const { getNotificationPrefs } = await import('./get-notification-prefs')
    const result = await getNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid UUID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { getNotificationPrefs } = await import('./get-notification-prefs')
    const result = await getNotificationPrefs({
      userId: 'not-a-uuid',
      userType: 'client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns existing prefs without upsert when all types present (hot path)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const seededPrefs = PREFERENCE_NOTIFICATION_TYPES.map((type) => ({
      id: `pref-${type}`,
      user_type: 'client',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      notification_type: type,
      channel_email: true,
      channel_inapp: true,
      operator_override: false,
      created_at: '2026-02-18T10:00:00Z',
      updated_at: '2026-02-18T10:00:00Z',
    }))

    // select() chain returns all prefs
    const mockEqUserId = vi.fn().mockResolvedValue({ data: seededPrefs, error: null })
    const mockEqUserType = vi.fn().mockReturnValue({ eq: mockEqUserId })
    const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqUserType })
    mockFrom.mockReturnValue({ select: mockSelectFn })

    const { getNotificationPrefs } = await import('./get-notification-prefs')
    const result = await getNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
    })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(PREFERENCE_NOTIFICATION_TYPES.length)
    expect(result.data![0]).toHaveProperty('channelEmail')
    expect(result.data![0]).not.toHaveProperty('channel_email')
    // from() should only be called once (for select, no upsert)
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('upserts defaults when fewer than expected prefs exist (cold path)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const partialPrefs = [
      {
        id: 'pref-message',
        user_type: 'client',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        notification_type: 'message',
        channel_email: true,
        channel_inapp: true,
        operator_override: false,
        created_at: '2026-02-18T10:00:00Z',
        updated_at: '2026-02-18T10:00:00Z',
      },
    ]

    const allPrefs = PREFERENCE_NOTIFICATION_TYPES.map((type) => ({
      id: `pref-${type}`,
      user_type: 'client',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      notification_type: type,
      channel_email: true,
      channel_inapp: true,
      operator_override: false,
      created_at: '2026-02-18T10:00:00Z',
      updated_at: '2026-02-18T10:00:00Z',
    }))

    // First call (select) returns partial, second call (upsert) returns all
    const mockEqUserId = vi.fn().mockResolvedValue({ data: partialPrefs, error: null })
    const mockEqUserType = vi.fn().mockReturnValue({ eq: mockEqUserId })
    const mockSelectChain = vi.fn().mockReturnValue({ eq: mockEqUserType })

    const mockUpsertSelectFn = vi.fn().mockResolvedValue({ data: allPrefs, error: null })
    const mockUpsertFn = vi.fn().mockReturnValue({ select: mockUpsertSelectFn })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return { select: mockSelectChain }
      }
      return { upsert: mockUpsertFn }
    })

    const { getNotificationPrefs } = await import('./get-notification-prefs')
    const result = await getNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
    })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(PREFERENCE_NOTIFICATION_TYPES.length)
    // from() should be called twice (select + upsert)
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('returns DATABASE_ERROR on select failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const mockEqUserId = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const mockEqUserType = vi.fn().mockReturnValue({ eq: mockEqUserId })
    const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqUserType })
    mockFrom.mockReturnValue({ select: mockSelectFn })

    const { getNotificationPrefs } = await import('./get-notification-prefs')
    const result = await getNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
