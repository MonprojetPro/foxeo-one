import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock email-client
const mockSend = vi.fn()
const mockSendWithRetry = vi.fn()
vi.mock('../_shared/email-client', () => ({
  createEmailClient: vi.fn(() => ({
    send: mockSend,
    sendWithRetry: mockSendWithRetry,
  })),
}))

// Mock Supabase client
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe('handleSendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should send email for "message" notification type — client recipient', async () => {
    // Mock notification fetch
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'n-1',
        recipient_type: 'client',
        recipient_id: 'client-uuid-1',
        type: 'message',
        title: 'Nouveau message de MiKL',
        body: 'Bonjour, voici les retours.',
        link: '/chat',
      },
      error: null,
    })
    // Mock client email fetch
    mockSingle.mockResolvedValueOnce({
      data: { email: 'alice@example.com', name: 'Alice', email_notifications_enabled: true },
      error: null,
    })
    // Mock log insert
    mockInsert.mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'clients') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return { select: vi.fn() }
    })

    mockSendWithRetry.mockResolvedValue(undefined)

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'n-1' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    expect(result.success).toBe(true)
  })

  it('should skip email when email_notifications_enabled is false', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'n-2',
        recipient_type: 'client',
        recipient_id: 'client-uuid-2',
        type: 'message',
        title: 'Test',
        body: null,
        link: null,
      },
      error: null,
    })
    mockSingle.mockResolvedValueOnce({
      data: { email: 'alice@example.com', name: 'Alice', email_notifications_enabled: false },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'clients') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return { select: vi.fn() }
    })

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'n-2' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(true)
    expect(mockSendWithRetry).not.toHaveBeenCalled()
  })

  it('should return error when notification not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
    }))

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'bad-id' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should log failure in activity_logs when email send fails', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'n-3',
        recipient_type: 'client',
        recipient_id: 'client-uuid-3',
        type: 'message',
        title: 'Test',
        body: null,
        link: null,
      },
      error: null,
    })
    mockSingle.mockResolvedValueOnce({
      data: { email: 'alice@example.com', name: 'Alice', email_notifications_enabled: true },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'clients') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return { select: vi.fn() }
    })

    mockSendWithRetry.mockRejectedValue(new Error('Email service down'))

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'n-3' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    // Should succeed with degraded mode (in-app OK, email failed)
    expect(result.success).toBe(false)
    expect(result.emailFailed).toBe(true)
    // Failure should be logged
    expect(mockInsert).toHaveBeenCalled()
  })
})

describe('handleDirectEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  const config = {
    supabaseUrl: 'https://test.supabase.co',
    serviceRoleKey: 'test-key',
    resendApiKey: 'resend-key',
    emailFrom: 'noreply@monprojet-pro.com',
  }

  it('sends welcome-lab email successfully', async () => {
    mockSendWithRetry.mockResolvedValue(undefined)
    const { handleDirectEmail } = await import('./handler')
    const result = await handleDirectEmail(
      {
        to: 'prospect@example.com',
        template: 'welcome-lab',
        data: { clientName: 'Alice', parcoursName: 'Parcours Complet', activationLink: 'https://lab.monprojet-pro.com/activate' },
      },
      config
    )
    expect(result.success).toBe(true)
    expect(mockSendWithRetry).toHaveBeenCalledOnce()
  })

  it('sends prospect-resources email successfully', async () => {
    mockSendWithRetry.mockResolvedValue(undefined)
    const { handleDirectEmail } = await import('./handler')
    const result = await handleDirectEmail(
      {
        to: 'prospect@example.com',
        template: 'prospect-resources',
        data: { links: [{ name: 'Guide.pdf', url: 'https://storage.example.com/guide.pdf' }] },
      },
      config
    )
    expect(result.success).toBe(true)
    expect(mockSendWithRetry).toHaveBeenCalledOnce()
  })

  it('returns error for unknown template', async () => {
    const { handleDirectEmail } = await import('./handler')
    const result = await handleDirectEmail(
      { to: 'test@example.com', template: 'unknown-template' as 'welcome-lab', data: {} },
      config
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown direct template')
  })

  it('returns error when email client throws', async () => {
    mockSendWithRetry.mockRejectedValue(new Error('SMTP connection failed'))
    const { handleDirectEmail } = await import('./handler')
    const result = await handleDirectEmail(
      {
        to: 'prospect@example.com',
        template: 'welcome-lab',
        data: { clientName: 'Bob', parcoursName: 'Parcours', activationLink: 'https://link' },
      },
      config
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('SMTP connection failed')
  })
})
