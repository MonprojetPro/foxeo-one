import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClientAuthUser } from './create-client-auth-user'

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
