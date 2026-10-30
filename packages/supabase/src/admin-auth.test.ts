import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createClientAuthUser,
  generatePasswordSetupLink,
  ensureClientAuthAccount,
  sendWelcomeLabInvite,
  sendWelcomeOneInvite,
} from './admin-auth'

function makeAdmin(
  result: { data: { user: { id: string } | null } | null; error: { message: string } | null }
): SupabaseClient {
  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(result),
      },
    },
  } as unknown as SupabaseClient
}

describe('createClientAuthUser', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the user id on success', async () => {
    const admin = makeAdmin({ data: { user: { id: 'user-123' } }, error: null })
    const result = await createClientAuthUser({
      email: 'test@example.com',
      password: 'TempPass-01',
      adminClient: admin,
    })
    expect(result).toEqual({ userId: 'user-123', error: null })
  })

  it('passes email_confirm: true so the user can log in immediately', async () => {
    const admin = makeAdmin({ data: { user: { id: 'user-1' } }, error: null })
    await createClientAuthUser({
      email: 'a@b.fr',
      password: 'xxx',
      adminClient: admin,
    })
    expect(admin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'a@b.fr',
      password: 'xxx',
      email_confirm: true,
    })
  })

  it('returns AUTH_ADMIN_CREATE_FAILED when supabase returns an error', async () => {
    const admin = makeAdmin({ data: null, error: { message: 'duplicate' } })
    const result = await createClientAuthUser({
      email: 'dup@example.com',
      password: 'xxx',
      adminClient: admin,
    })
    expect(result.userId).toBeNull()
    expect(result.error?.code).toBe('AUTH_ADMIN_CREATE_FAILED')
    expect(result.error?.message).toBe('duplicate')
  })

  it('returns AUTH_ADMIN_CREATE_FAILED when user is null', async () => {
    const admin = makeAdmin({ data: { user: null }, error: null })
    const result = await createClientAuthUser({
      email: 'x@y.fr',
      password: 'xxx',
      adminClient: admin,
    })
    expect(result.userId).toBeNull()
    expect(result.error?.code).toBe('AUTH_ADMIN_CREATE_FAILED')
  })

  it('returns CONFIG_ERROR when env vars are missing and no client is provided', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const result = await createClientAuthUser({
      email: 'x@y.fr',
      password: 'xxx',
    })
    expect(result.userId).toBeNull()
    expect(result.error?.code).toBe('CONFIG_ERROR')
  })
})

function makeAdminForLink(generateLinkImpl: () => unknown): SupabaseClient {
  return {
    auth: { admin: { generateLink: vi.fn(generateLinkImpl) } },
  } as unknown as SupabaseClient
}

const ACTION_LINK = 'https://supabase.example/verify?token=xyz&redirect_to=cb'

describe('generatePasswordSetupLink', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_CLIENT_URL', 'https://app.monprojet-pro.com')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('generates a recovery link redirecting to /reset-password', async () => {
    const admin = makeAdminForLink(() => ({ data: { properties: { action_link: ACTION_LINK } }, error: null }))
    const result = await generatePasswordSetupLink({ email: 'client@example.com', adminClient: admin })

    expect(result.error).toBeNull()
    expect(result.link).toBe(ACTION_LINK)
    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'client@example.com',
      options: { redirectTo: 'https://app.monprojet-pro.com/auth/callback?next=/reset-password' },
    })
  })

  it('returns an error when generateLink fails', async () => {
    const admin = makeAdminForLink(() => ({ data: null, error: { message: 'rate limited' } }))
    const result = await generatePasswordSetupLink({ email: 'client@example.com', adminClient: admin })
    expect(result.link).toBeNull()
    expect(result.error?.message).toBe('rate limited')
  })
})

function makeRequestSupabase(updateEqImpl: () => unknown): SupabaseClient {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(updateEqImpl) })),
    })),
  } as unknown as SupabaseClient
}

describe('ensureClientAuthAccount', () => {
  it('returns the existing account without creating one', async () => {
    const supabase = makeRequestSupabase(() => ({ error: null }))
    const result = await ensureClientAuthAccount({
      supabase,
      clientId: 'c-1',
      email: 'client@example.com',
      authUserId: 'existing-id',
    })
    expect(result).toEqual({ authUserId: 'existing-id', created: false, error: null })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns NO_EMAIL when the client has neither account nor email', async () => {
    const supabase = makeRequestSupabase(() => ({ error: null }))
    const result = await ensureClientAuthAccount({
      supabase,
      clientId: 'c-1',
      email: null,
      authUserId: null,
    })
    expect(result.authUserId).toBeNull()
    expect(result.error?.code).toBe('NO_EMAIL')
  })

  it('creates the account and links clients.auth_user_id', async () => {
    const supabase = makeRequestSupabase(() => ({ error: null }))
    const admin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-id' } }, error: null }),
        },
      },
    } as unknown as SupabaseClient

    const result = await ensureClientAuthAccount({
      supabase,
      clientId: 'c-1',
      email: 'nouveau@example.com',
      authUserId: null,
      adminClient: admin,
    })
    expect(result).toEqual({ authUserId: 'new-id', created: true, error: null })
  })

  it('still returns the new account when the link to clients.auth_user_id fails', async () => {
    const supabase = makeRequestSupabase(() => ({ error: { message: 'update failed' } }))
    const admin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-id' } }, error: null }),
        },
      },
    } as unknown as SupabaseClient

    const result = await ensureClientAuthAccount({
      supabase,
      clientId: 'c-1',
      email: 'nouveau@example.com',
      authUserId: null,
      adminClient: admin,
    })
    expect(result.authUserId).toBe('new-id')
    expect(result.created).toBe(true)
  })

  it('propagates the error when account creation fails', async () => {
    const supabase = makeRequestSupabase(() => ({ error: null }))
    const admin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
        },
      },
    } as unknown as SupabaseClient

    const result = await ensureClientAuthAccount({
      supabase,
      clientId: 'c-1',
      email: 'echec@example.com',
      authUserId: null,
      adminClient: admin,
    })
    expect(result.authUserId).toBeNull()
    expect(result.error?.code).toBe('AUTH_ADMIN_CREATE_FAILED')
  })
})

describe('sendWelcomeLabInvite / sendWelcomeOneInvite', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db.example')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
    vi.stubEnv('NEXT_PUBLIC_CLIENT_URL', 'https://app.monprojet-pro.com')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sendWelcomeLabInvite posts the welcome-lab template with the recovery link', async () => {
    const admin = makeAdminForLink(() => ({ data: { properties: { action_link: ACTION_LINK } }, error: null }))
    const result = await sendWelcomeLabInvite({
      email: 'client@example.com',
      clientName: 'ACME SARL',
      firstStepLabel: 'Identité de marque',
      adminClient: admin,
    })

    expect(result.success).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://db.example/functions/v1/send-email')
    const payload = JSON.parse((init as RequestInit).body as string)
    expect(payload).toMatchObject({
      to: 'client@example.com',
      template: 'welcome-lab',
      data: { clientName: 'ACME SARL', firstStepLabel: 'Identité de marque', activationLink: ACTION_LINK },
    })
  })

  it('sendWelcomeLabInvite works without a firstStepLabel (activation avant composition du parcours)', async () => {
    const admin = makeAdminForLink(() => ({ data: { properties: { action_link: ACTION_LINK } }, error: null }))
    const result = await sendWelcomeLabInvite({ email: 'client@example.com', clientName: 'ACME SARL', adminClient: admin })
    expect(result.success).toBe(true)
    const [, initNoStep] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(initNoStep.body as string)
    expect(payload.data.firstStepLabel).toBeUndefined()
  })

  it('sendWelcomeOneInvite posts the welcome-one template with needsPasswordSetup', async () => {
    const admin = makeAdminForLink(() => ({ data: { properties: { action_link: ACTION_LINK } }, error: null }))
    const result = await sendWelcomeOneInvite({ email: 'client@example.com', clientName: 'ACME SARL', adminClient: admin })

    expect(result.success).toBe(true)
    const [, initOne] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(initOne.body as string)
    expect(payload).toMatchObject({
      to: 'client@example.com',
      template: 'welcome-one',
      data: {
        clientName: 'ACME SARL',
        activationLink: ACTION_LINK,
        temporaryPassword: null,
        needsPasswordSetup: true,
      },
    })
  })

  it('never calls send-email when generateLink fails', async () => {
    const admin = makeAdminForLink(() => ({ data: null, error: { message: 'rate limited' } }))
    const result = await sendWelcomeOneInvite({ email: 'client@example.com', clientName: 'ACME SARL', adminClient: admin })
    expect(result.success).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns an error when send-email responds non-ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' })
    const admin = makeAdminForLink(() => ({ data: { properties: { action_link: ACTION_LINK } }, error: null }))
    const result = await sendWelcomeLabInvite({ email: 'client@example.com', clientName: 'ACME SARL', adminClient: admin })
    expect(result.success).toBe(false)
    expect(result.error).toContain('500')
  })
})
