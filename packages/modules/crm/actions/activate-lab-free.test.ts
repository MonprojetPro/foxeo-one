import { describe, it, expect, vi, beforeEach } from 'vitest'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'
const testOperatorDbId = '550e8400-e29b-41d4-a716-446655440010'
const testClientId = '550e8400-e29b-41d4-a716-446655440001'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockGetUser = vi.fn()
const mockOperatorSingle = vi.fn()
const mockClientSingle = vi.fn()
const mockConfigUpdateEq = vi.fn()
const mockActivityInsert = vi.fn().mockResolvedValue({ error: null })
const mockNotificationInsert = vi.fn().mockResolvedValue({ error: null })

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockOperatorSingle })) })) }
  }
  if (table === 'clients') {
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockClientSingle })) })) }
  }
  if (table === 'client_configs') {
    return { update: vi.fn(() => ({ eq: mockConfigUpdateEq })) }
  }
  if (table === 'activity_logs') {
    return { insert: mockActivityInsert }
  }
  if (table === 'notifications') {
    return { insert: mockNotificationInsert }
  }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: mockGetUser } })),
}))

const mockEnsureClientAuthAccount = vi.fn()
const mockSendWelcomeLabInvite = vi.fn()

vi.mock('@monprojetpro/supabase/admin', () => ({
  ensureClientAuthAccount: mockEnsureClientAuthAccount,
  sendWelcomeLabInvite: mockSendWelcomeLabInvite,
}))

describe('activateLabFree Server Action', () => {
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
        auth_user_id: null,
        client_configs: { lab_mode_available: false },
      },
      error: null,
    })
    mockConfigUpdateEq.mockResolvedValue({ error: null })
    mockEnsureClientAuthAccount.mockResolvedValue({ authUserId: 'new-auth-id', created: true, error: null })
    mockSendWelcomeLabInvite.mockResolvedValue({ success: true })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { activateLabFree } = await import('./activate-lab-free')
    const result = await activateLabFree({ clientId: testClientId })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for an invalid clientId', async () => {
    const { activateLabFree } = await import('./activate-lab-free')
    const result = await activateLabFree({ clientId: 'not-a-uuid' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns ALREADY_ACTIVE when the Lab is already on', async () => {
    mockClientSingle.mockResolvedValue({
      data: {
        id: testClientId,
        name: 'ACME SARL',
        first_name: 'Jean',
        email: 'client@example.com',
        auth_user_id: 'existing-id',
        client_configs: { lab_mode_available: true },
      },
      error: null,
    })
    const { activateLabFree } = await import('./activate-lab-free')
    const result = await activateLabFree({ clientId: testClientId })
    expect(result.error?.code).toBe('ALREADY_ACTIVE')
    expect(mockEnsureClientAuthAccount).not.toHaveBeenCalled()
  })

  it('creates the account, activates client_configs and sends the welcome email', async () => {
    const { activateLabFree } = await import('./activate-lab-free')
    const result = await activateLabFree({ clientId: testClientId })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ clientId: testClientId })

    expect(mockEnsureClientAuthAccount).toHaveBeenCalledWith({
      supabase: expect.anything(),
      clientId: testClientId,
      email: 'client@example.com',
      authUserId: null,
    })
    expect(mockConfigUpdateEq).toHaveBeenCalled()
    expect(mockSendWelcomeLabInvite).toHaveBeenCalledWith({
      email: 'client@example.com',
      clientName: 'Jean',
    })
  })

  it('does not resend the welcome email when the account already existed', async () => {
    mockEnsureClientAuthAccount.mockResolvedValue({ authUserId: 'existing-id', created: false, error: null })
    const { activateLabFree } = await import('./activate-lab-free')
    const result = await activateLabFree({ clientId: testClientId })
    expect(result.error).toBeNull()
    expect(mockSendWelcomeLabInvite).not.toHaveBeenCalled()
  })

  it('returns AUTH_ERROR without activating the Lab when the account cannot be created', async () => {
    mockEnsureClientAuthAccount.mockResolvedValue({
      authUserId: null,
      created: false,
      error: { code: 'AUTH_ADMIN_CREATE_FAILED', message: 'boom' },
    })
    const { activateLabFree } = await import('./activate-lab-free')
    const result = await activateLabFree({ clientId: testClientId })
    expect(result.error?.code).toBe('AUTH_ERROR')
    expect(mockConfigUpdateEq).not.toHaveBeenCalled()
  })

  it('alerts the operator but does not fail when the welcome email fails', async () => {
    mockSendWelcomeLabInvite.mockResolvedValue({ success: false, error: 'SMTP down' })
    const { activateLabFree } = await import('./activate-lab-free')
    const result = await activateLabFree({ clientId: testClientId })
    expect(result.error).toBeNull()
    expect(mockNotificationInsert).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_type: 'operator', type: 'alert' })
    )
  })
})
