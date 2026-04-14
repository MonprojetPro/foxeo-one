import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

// Mock checkNotificationAllowed — default: allow all
const mockCheckAllowed = vi.fn().mockResolvedValue({ inapp: true, email: true })
vi.mock('./check-notification-allowed', () => ({
  checkNotificationAllowed: (...args: unknown[]) => mockCheckAllowed(...args),
}))

describe('createNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'err' } })

    const { createNotification } = await import('./create-notification')
    const result = await createNotification({
      recipientType: 'operator',
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'message',
      title: 'Test',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for invalid input', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { createNotification } = await import('./create-notification')
    const result = await createNotification({
      recipientType: 'operator',
      recipientId: 'bad-id',
      type: 'message',
      title: 'Test',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should create notification and return camelCase result', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({
      data: {
        id: 'n-1',
        recipient_type: 'operator',
        recipient_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'message',
        title: 'Test',
        body: null,
        link: null,
        read_at: null,
        created_at: '2026-02-17T10:00:00Z',
      },
      error: null,
    })

    const { createNotification } = await import('./create-notification')
    const result = await createNotification({
      recipientType: 'operator',
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'message',
      title: 'Test',
    })

    expect(result.error).toBeNull()
    expect(result.data).toHaveProperty('recipientType', 'operator')
    expect(result.data).toHaveProperty('readAt', null)
    expect(result.data).not.toHaveProperty('recipient_type')
  })

  it('should return DATABASE_ERROR on insert failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })

    const { createNotification } = await import('./create-notification')
    const result = await createNotification({
      recipientType: 'operator',
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'message',
      title: 'Test',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should skip in-app creation when channel_inapp=false (preference check)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockCheckAllowed.mockResolvedValueOnce({ inapp: false, email: true })

    const { createNotification } = await import('./create-notification')
    const result = await createNotification({
      recipientType: 'client',
      recipientId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'message',
      title: 'Test',
    })

    // Silent skip: data=null, error=null
    expect(result.data).toBeNull()
    expect(result.error).toBeNull()
    // No insert should have been called
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
