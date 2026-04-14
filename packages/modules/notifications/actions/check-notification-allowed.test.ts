import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockEq1 = vi.fn()
const mockEq2 = vi.fn()
const mockEq3 = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe('checkNotificationAllowed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  const setup = () => {
    mockEq3.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockEq2.mockReturnValue({ eq: mockEq3 })
    mockEq1.mockReturnValue({ eq: mockEq2 })
    mockSelect.mockReturnValue({ eq: mockEq1 })
    mockFrom.mockReturnValue({ select: mockSelect })
  }

  it('returns { inapp: true, email: true } when no preference exists (defaults)', async () => {
    setup()
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { checkNotificationAllowed } = await import('./check-notification-allowed')
    const result = await checkNotificationAllowed({
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      recipientType: 'client',
      notificationType: 'message',
    })

    expect(result.inapp).toBe(true)
    expect(result.email).toBe(true)
  })

  it('respects client preference (email disabled)', async () => {
    setup()
    mockMaybeSingle.mockResolvedValue({
      data: {
        channel_email: false,
        channel_inapp: true,
        operator_override: false,
        notification_type: 'message',
      },
      error: null,
    })

    const { checkNotificationAllowed } = await import('./check-notification-allowed')
    const result = await checkNotificationAllowed({
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      recipientType: 'client',
      notificationType: 'message',
    })

    expect(result.inapp).toBe(true)
    expect(result.email).toBe(false)
  })

  it('operator_override forces both channels true', async () => {
    setup()
    mockMaybeSingle.mockResolvedValue({
      data: {
        channel_email: false,
        channel_inapp: false,
        operator_override: true,
        notification_type: 'message',
      },
      error: null,
    })

    const { checkNotificationAllowed } = await import('./check-notification-allowed')
    const result = await checkNotificationAllowed({
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      recipientType: 'client',
      notificationType: 'message',
    })

    expect(result.inapp).toBe(true)
    expect(result.email).toBe(true)
  })

  it('critical types (system) force inapp=true regardless of preference', async () => {
    setup()
    mockMaybeSingle.mockResolvedValue({
      data: {
        channel_email: true,
        channel_inapp: false, // client tried to disable, but critical
        operator_override: false,
        notification_type: 'system',
      },
      error: null,
    })

    const { checkNotificationAllowed } = await import('./check-notification-allowed')
    const result = await checkNotificationAllowed({
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      recipientType: 'client',
      notificationType: 'system',
    })

    expect(result.inapp).toBe(true)
    expect(result.email).toBe(true)
  })

  it('critical types (graduation) force inapp=true regardless of preference', async () => {
    setup()
    mockMaybeSingle.mockResolvedValue({
      data: {
        channel_email: false,
        channel_inapp: false,
        operator_override: false,
        notification_type: 'graduation',
      },
      error: null,
    })

    const { checkNotificationAllowed } = await import('./check-notification-allowed')
    const result = await checkNotificationAllowed({
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      recipientType: 'client',
      notificationType: 'graduation',
    })

    expect(result.inapp).toBe(true)
    expect(result.email).toBe(false)
  })

  it('returns defaults on DB error', async () => {
    setup()
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { checkNotificationAllowed } = await import('./check-notification-allowed')
    const result = await checkNotificationAllowed({
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      recipientType: 'client',
      notificationType: 'message',
    })

    // Fail-open: default to sending on DB error
    expect(result.inapp).toBe(true)
    expect(result.email).toBe(true)
  })
})
