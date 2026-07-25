import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildImpersonationLink,
  getClientAppUrl,
  IMPERSONATION_CALLBACK_PATH,
} from './build-impersonation-link'

function adminMock(result: unknown) {
  const generateLink = vi.fn().mockResolvedValue(result)
  return {
    client: { auth: { admin: { generateLink } } } as never,
    generateLink,
  }
}

describe('getClientAppUrl', () => {
  const original = process.env.NEXT_PUBLIC_CLIENT_URL

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_CLIENT_URL
    else process.env.NEXT_PUBLIC_CLIENT_URL = original
  })

  it('uses NEXT_PUBLIC_CLIENT_URL when defined', () => {
    process.env.NEXT_PUBLIC_CLIENT_URL = 'https://staging.example.com'
    expect(getClientAppUrl()).toBe('https://staging.example.com')
  })

  it('falls back to production, never localhost', () => {
    delete process.env.NEXT_PUBLIC_CLIENT_URL
    expect(getClientAppUrl()).toBe('https://app.monprojet-pro.com')
  })
})

describe('buildImpersonationLink', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLIENT_URL = 'https://app.monprojet-pro.com'
  })

  it('builds a callback URL carrying the hashed token and session id', async () => {
    const { client, generateLink } = adminMock({
      data: { properties: { hashed_token: 'hash-xyz' } },
      error: null,
    })

    const result = await buildImpersonationLink({
      email: 'client@test.com',
      sessionId: 'session-1',
      adminClient: client,
    })

    expect(result.error).toBeUndefined()
    expect(result.url).toBe(
      `https://app.monprojet-pro.com${IMPERSONATION_CALLBACK_PATH}?token_hash=hash-xyz&session=session-1`
    )
    expect(generateLink).toHaveBeenCalledWith({
      type: 'magiclink',
      email: 'client@test.com',
      options: {
        redirectTo: `https://app.monprojet-pro.com${IMPERSONATION_CALLBACK_PATH}`,
      },
    })
  })

  it('returns an error when generateLink fails', async () => {
    const { client } = adminMock({ data: null, error: { message: 'user not found' } })

    const result = await buildImpersonationLink({
      email: 'ghost@test.com',
      sessionId: 'session-1',
      adminClient: client,
    })

    expect(result.url).toBeUndefined()
    expect(result.error).toBe('user not found')
  })

  it('returns an error when the hashed token is missing', async () => {
    const { client } = adminMock({ data: { properties: {} }, error: null })

    const result = await buildImpersonationLink({
      email: 'client@test.com',
      sessionId: 'session-1',
      adminClient: client,
    })

    expect(result.error).toContain('hashed_token')
  })

  it('reports missing service role configuration instead of throwing', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const result = await buildImpersonationLink({
      email: 'client@test.com',
      sessionId: 'session-1',
    })

    expect(result.error).toContain('SUPABASE_SERVICE_ROLE_KEY')

    if (url !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = url
    if (key !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = key
  })
})
