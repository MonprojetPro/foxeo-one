import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWelcomeLabInvite } from './send-welcome-lab-invite'

const ACTION_LINK = 'https://supabase.example/verify?token=xyz&redirect_to=cb'

function makeAdminClient(generateLinkImpl: () => unknown): SupabaseClient {
  return {
    auth: {
      admin: {
        generateLink: vi.fn(generateLinkImpl),
      },
    },
  } as unknown as SupabaseClient
}

const PARAMS = {
  email: 'client@example.com',
  clientName: 'ACME SARL',
  firstStepLabel: 'Identité de marque',
}

describe('sendWelcomeLabInvite', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.example'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.NEXT_PUBLIC_CLIENT_URL = 'https://app.monprojet-pro.com'
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an error when service env vars are missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const admin = makeAdminClient(() => ({ data: { properties: { action_link: ACTION_LINK } }, error: null }))
    const result = await sendWelcomeLabInvite({ ...PARAMS, adminClient: admin })
    expect(result.success).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('generates a recovery link and posts the welcome-lab email with it', async () => {
    const admin = makeAdminClient(() => ({ data: { properties: { action_link: ACTION_LINK } }, error: null }))
    const result = await sendWelcomeLabInvite({ ...PARAMS, adminClient: admin })

    expect(result.success).toBe(true)

    // generateLink appelé en mode recovery avec le bon redirect vers /api/auth/callback
    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'client@example.com',
      options: { redirectTo: 'https://app.monprojet-pro.com/auth/callback?next=/reset-password' },
    })

    // send-email appelé avec le template welcome-lab et le lien comme activationLink
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://db.example/functions/v1/send-email')
    const payload = JSON.parse((init as RequestInit).body as string)
    expect(payload).toMatchObject({
      to: 'client@example.com',
      template: 'welcome-lab',
      data: {
        clientName: 'ACME SARL',
        firstStepLabel: 'Identité de marque',
        activationLink: ACTION_LINK,
      },
    })
  })

  it('returns an error and never sends email when generateLink fails', async () => {
    const admin = makeAdminClient(() => ({ data: null, error: { message: 'rate limited' } }))
    const result = await sendWelcomeLabInvite({ ...PARAMS, adminClient: admin })
    expect(result.success).toBe(false)
    expect(result.error).toContain('rate limited')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns an error when send-email responds non-ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' })
    const admin = makeAdminClient(() => ({ data: { properties: { action_link: ACTION_LINK } }, error: null }))
    const result = await sendWelcomeLabInvite({ ...PARAMS, adminClient: admin })
    expect(result.success).toBe(false)
    expect(result.error).toContain('500')
  })
})
