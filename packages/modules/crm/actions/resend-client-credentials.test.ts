import { describe, it, expect, vi, beforeEach } from 'vitest'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'
const testOperatorDbId = '550e8400-e29b-41d4-a716-446655440010'
const testClientId = '550e8400-e29b-41d4-a716-446655440001'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockGetUser = vi.fn()
const mockOperatorSingle = vi.fn()
const mockClientSingle = vi.fn()
const mockClientUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockActivityInsert = vi.fn().mockResolvedValue({ error: null })

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockOperatorSingle })) })) }
  }
  if (table === 'clients') {
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockClientSingle })) })),
      update: vi.fn(() => ({ eq: mockClientUpdateEq })),
    }
  }
  if (table === 'activity_logs') {
    return { insert: mockActivityInsert }
  }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: mockGetUser } })),
}))

const mockEnsureClientAuthAccount = vi.fn()
const mockSendWelcomeLabInvite = vi.fn()
const mockSendWelcomeOneInvite = vi.fn()

vi.mock('@monprojetpro/supabase/admin', () => ({
  ensureClientAuthAccount: mockEnsureClientAuthAccount,
  sendWelcomeLabInvite: mockSendWelcomeLabInvite,
  sendWelcomeOneInvite: mockSendWelcomeOneInvite,
}))

describe('resendClientCredentials Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: testOperatorId } }, error: null })
    mockOperatorSingle.mockResolvedValue({ data: { id: testOperatorDbId }, error: null })
    mockClientSingle.mockResolvedValue({
      data: {
        id: testClientId,
        name: 'ACME SARL',
        first_name: 'Jean',
        email: 'client@example.com',
        auth_user_id: 'existing-id',
        client_configs: { dashboard_type: 'lab' },
      },
      error: null,
    })
    mockEnsureClientAuthAccount.mockResolvedValue({ authUserId: 'existing-id', created: false, error: null })
    mockSendWelcomeLabInvite.mockResolvedValue({ success: true })
    mockSendWelcomeOneInvite.mockResolvedValue({ success: true })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { resendClientCredentials } = await import('./resend-client-credentials')
    const result = await resendClientCredentials(testClientId)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('resends the Lab invite and marks welcome_email_sent_at even when the account already existed', async () => {
    const { resendClientCredentials } = await import('./resend-client-credentials')
    const result = await resendClientCredentials(testClientId)

    expect(result.error).toBeNull()
    expect(result.data?.sentAt).toBeTruthy()
    expect(mockSendWelcomeLabInvite).toHaveBeenCalledWith({ email: 'client@example.com', clientName: 'Jean' })
    expect(mockSendWelcomeOneInvite).not.toHaveBeenCalled()
    expect(mockClientUpdateEq).toHaveBeenCalled()
  })

  it('sends welcome-one (not welcome-lab) when the client dashboard is One', async () => {
    mockClientSingle.mockResolvedValue({
      data: {
        id: testClientId,
        name: 'ACME SARL',
        first_name: 'Jean',
        email: 'client@example.com',
        auth_user_id: 'existing-id',
        client_configs: { dashboard_type: 'one' },
      },
      error: null,
    })
    const { resendClientCredentials } = await import('./resend-client-credentials')
    await resendClientCredentials(testClientId)

    expect(mockSendWelcomeOneInvite).toHaveBeenCalledWith({ email: 'client@example.com', clientName: 'Jean' })
    expect(mockSendWelcomeLabInvite).not.toHaveBeenCalled()
  })

  it('creates the account first when the client never had one', async () => {
    mockClientSingle.mockResolvedValue({
      data: {
        id: testClientId,
        name: 'ACME SARL',
        first_name: 'Jean',
        email: 'client@example.com',
        auth_user_id: null,
        client_configs: { dashboard_type: 'lab' },
      },
      error: null,
    })
    mockEnsureClientAuthAccount.mockResolvedValue({ authUserId: 'brand-new-id', created: true, error: null })

    const { resendClientCredentials } = await import('./resend-client-credentials')
    const result = await resendClientCredentials(testClientId)

    expect(result.error).toBeNull()
    expect(mockEnsureClientAuthAccount).toHaveBeenCalledWith({
      supabase: expect.anything(),
      clientId: testClientId,
      email: 'client@example.com',
      authUserId: null,
    })
    expect(mockSendWelcomeLabInvite).toHaveBeenCalled()
  })

  it('returns NO_EMAIL without creating an account when the client has no email', async () => {
    mockClientSingle.mockResolvedValue({
      data: {
        id: testClientId,
        name: 'ACME SARL',
        first_name: 'Jean',
        email: null,
        auth_user_id: null,
        client_configs: { dashboard_type: 'lab' },
      },
      error: null,
    })
    const { resendClientCredentials } = await import('./resend-client-credentials')
    const result = await resendClientCredentials(testClientId)
    expect(result.error?.code).toBe('NO_EMAIL')
    expect(mockEnsureClientAuthAccount).not.toHaveBeenCalled()
  })

  it('returns AUTH_ERROR when the account cannot be created', async () => {
    mockEnsureClientAuthAccount.mockResolvedValue({
      authUserId: null,
      created: false,
      error: { code: 'AUTH_ADMIN_CREATE_FAILED', message: 'boom' },
    })
    const { resendClientCredentials } = await import('./resend-client-credentials')
    const result = await resendClientCredentials(testClientId)
    expect(result.error?.code).toBe('AUTH_ERROR')
    expect(mockSendWelcomeLabInvite).not.toHaveBeenCalled()
  })

  it('returns EMAIL_ERROR to the screen (no silent swallow) when the invite fails', async () => {
    mockSendWelcomeLabInvite.mockResolvedValue({ success: false, error: 'SMTP down' })
    const { resendClientCredentials } = await import('./resend-client-credentials')
    const result = await resendClientCredentials(testClientId)
    expect(result.error?.code).toBe('EMAIL_ERROR')
    expect(mockClientUpdateEq).not.toHaveBeenCalled()
  })
})
