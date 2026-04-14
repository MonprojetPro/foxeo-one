import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockEq1 = vi.fn()
const mockEq2 = vi.fn()
const mockEq3 = vi.fn()
const mockUpdate = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('updateNotificationPrefs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { updateNotificationPrefs } = await import('./update-notification-prefs')
    const result = await updateNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
      notificationType: 'message',
      channelEmail: false,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR when no channel is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { updateNotificationPrefs } = await import('./update-notification-prefs')
    const result = await updateNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
      notificationType: 'message',
      // no channelEmail or channelInapp
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('updates preference and returns camelCase result', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({
      data: {
        id: 'pref-1',
        user_type: 'client',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        notification_type: 'message',
        channel_email: false,
        channel_inapp: true,
        operator_override: false,
        created_at: '2026-02-18T10:00:00Z',
        updated_at: '2026-02-18T10:00:00Z',
      },
      error: null,
    })
    mockEq3.mockReturnValue({ select: mockSelect })
    mockEq2.mockReturnValue({ eq: mockEq3 })
    mockEq1.mockReturnValue({ eq: mockEq2 })
    mockUpdate.mockReturnValue({ eq: mockEq1 })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { updateNotificationPrefs } = await import('./update-notification-prefs')
    const result = await updateNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
      notificationType: 'message',
      channelEmail: false,
    })

    expect(result.error).toBeNull()
    expect(result.data).toHaveProperty('channelEmail', false)
    expect(result.data).not.toHaveProperty('channel_email')
  })

  it('forces channelInapp=true for critical types (system)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({
      data: {
        id: 'pref-2',
        user_type: 'client',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        notification_type: 'system',
        channel_email: true,
        channel_inapp: true, // forced to true even if false requested
        operator_override: false,
        created_at: '2026-02-18T10:00:00Z',
        updated_at: '2026-02-18T10:00:00Z',
      },
      error: null,
    })
    mockEq3.mockReturnValue({ select: mockSelect })
    mockEq2.mockReturnValue({ eq: mockEq3 })
    mockEq1.mockReturnValue({ eq: mockEq2 })
    mockUpdate.mockReturnValue({ eq: mockEq1 })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { updateNotificationPrefs } = await import('./update-notification-prefs')
    const result = await updateNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
      notificationType: 'system',
      channelInapp: false, // should be forced to true
    })

    // The update call should have been called with channelInapp: true
    const updateCallArgs = mockUpdate.mock.calls[0]?.[0]
    expect(updateCallArgs).toHaveProperty('channel_inapp', true)
  })

  it('forces channelInapp=true for critical types (graduation)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({
      data: {
        id: 'pref-3',
        user_type: 'client',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        notification_type: 'graduation',
        channel_email: true,
        channel_inapp: true,
        operator_override: false,
        created_at: '2026-02-18T10:00:00Z',
        updated_at: '2026-02-18T10:00:00Z',
      },
      error: null,
    })
    mockEq3.mockReturnValue({ select: mockSelect })
    mockEq2.mockReturnValue({ eq: mockEq3 })
    mockEq1.mockReturnValue({ eq: mockEq2 })
    mockUpdate.mockReturnValue({ eq: mockEq1 })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { updateNotificationPrefs } = await import('./update-notification-prefs')
    await updateNotificationPrefs({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'client',
      notificationType: 'graduation',
      channelInapp: false,
    })

    const updateCallArgs = mockUpdate.mock.calls[0]?.[0]
    expect(updateCallArgs).toHaveProperty('channel_inapp', true)
  })
})
