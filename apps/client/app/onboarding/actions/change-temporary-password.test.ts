import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock ─────────────────────────────────────────────────────────────

const getUser = vi.fn()
const updateUser = vi.fn()
const clientsUpdateEq = vi.fn()
const clientsUpdate = vi.fn(() => ({ eq: clientsUpdateEq }))
const fromMock = vi.fn((table: string) => {
  if (table === 'clients') return { update: clientsUpdate }
  throw new Error(`unexpected table: ${table}`)
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser, updateUser },
      from: fromMock,
    })
  ),
}))

import { changeTemporaryPassword } from './change-temporary-password'

describe('changeTemporaryPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    updateUser.mockResolvedValue({ error: null })
    clientsUpdateEq.mockResolvedValue({ error: null })
  })

  it('rejects passwords shorter than 10 characters', async () => {
    const res = await changeTemporaryPassword('short')
    expect(res.error?.code).toBe('WEAK_PASSWORD')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('returns UNAUTHORIZED when no user session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await changeTemporaryPassword('StrongPassword1!')
    expect(res.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns AUTH_UPDATE_FAILED when supabase updateUser errors', async () => {
    updateUser.mockResolvedValue({ error: { message: 'boom' } })
    const res = await changeTemporaryPassword('StrongPassword1!')
    expect(res.error?.code).toBe('AUTH_UPDATE_FAILED')
    expect(clientsUpdate).not.toHaveBeenCalled()
  })

  it('updates auth + retombe password_change_required on success', async () => {
    const res = await changeTemporaryPassword('StrongPassword1!')
    expect(res.data).toEqual({ ok: true })
    expect(updateUser).toHaveBeenCalledWith({ password: 'StrongPassword1!' })
    expect(clientsUpdate).toHaveBeenCalledWith({ password_change_required: false })
  })

  it('returns DATABASE_ERROR when clients.update fails', async () => {
    clientsUpdateEq.mockResolvedValue({ error: { message: 'nope' } })
    const res = await changeTemporaryPassword('StrongPassword1!')
    expect(res.error?.code).toBe('DATABASE_ERROR')
  })
})
