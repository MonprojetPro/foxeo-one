import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock email-client — simulates service unavailable
const mockSendWithRetry = vi.fn()
vi.mock('../_shared/email-client', () => ({
  createEmailClient: vi.fn(() => ({
    send: vi.fn(),
    sendWithRetry: mockSendWithRetry,
  })),
}))

// Mock Supabase client
const mockSingle = vi.fn()
const mockInsert = vi.fn()

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'activity_logs') return { insert: mockInsert }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
    }),
  })),
}))

describe('Resilience — mode dégradé email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should log email failure and return emailFailed=true when service is down', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'n-res-1',
          recipient_type: 'client',
          recipient_id: 'c-uuid-1',
          type: 'message',
          title: 'Test',
          body: null,
          link: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { email: 'alice@example.com', name: 'Alice', email_notifications_enabled: true },
        error: null,
      })

    mockInsert.mockResolvedValue({ error: null })
    mockSendWithRetry.mockRejectedValue(new Error('ECONNREFUSED'))

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'n-res-1' },
      {
        supabaseUrl: 'https://test.supabase.co',
        serviceRoleKey: 'svc-key',
        resendApiKey: 'resend-key',
        emailFrom: 'noreply@monprojet-pro.com',
      }
    )

    // Email fails but in-app notification is unaffected (function returns gracefully)
    expect(result.emailFailed).toBe(true)
    expect(result.success).toBe(false)

    // Failure must be logged in activity_logs
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'email_failed', actor_type: 'system' })
    )
  })

  it('should return success=true when email_notifications_enabled is false', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'n-res-2',
          recipient_type: 'operator',
          recipient_id: 'op-uuid-1',
          type: 'alert',
          title: 'Alert',
          body: null,
          link: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { email: 'mikl@monprojet-pro.com', name: 'MiKL', email_notifications_enabled: false },
        error: null,
      })

    mockInsert.mockResolvedValue({ error: null })

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'n-res-2' },
      {
        supabaseUrl: 'https://test.supabase.co',
        serviceRoleKey: 'svc-key',
        resendApiKey: 'resend-key',
        emailFrom: 'noreply@monprojet-pro.com',
      }
    )

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(true)
    expect(mockSendWithRetry).not.toHaveBeenCalled()
  })
})
