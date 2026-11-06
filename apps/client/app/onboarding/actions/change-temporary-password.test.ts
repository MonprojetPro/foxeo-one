import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock ─────────────────────────────────────────────────────────────

const getUser = vi.fn()
const updateUser = vi.fn()
const rpcMock = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser, updateUser },
      rpc: rpcMock,
    })
  ),
}))

import { changeTemporaryPassword } from './change-temporary-password'

describe('changeTemporaryPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    updateUser.mockResolvedValue({ error: null })
    // T-076 — password_change_required est retombé via la RPC SECURITY DEFINER
    // fn_clear_password_change_required (un .update() direct est filtré en
    // silence par la RLS : aucune policy n'autorise un client à modifier sa
    // propre fiche).
    rpcMock.mockResolvedValue({ data: true, error: null })
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
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('updates auth + retombe password_change_required on success', async () => {
    const res = await changeTemporaryPassword('StrongPassword1!')
    expect(res.data).toEqual({ ok: true })
    expect(updateUser).toHaveBeenCalledWith({ password: 'StrongPassword1!' })
    expect(rpcMock).toHaveBeenCalledWith('fn_clear_password_change_required')
  })

  it('returns DATABASE_ERROR when the RPC errors', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'nope' } })
    const res = await changeTemporaryPassword('StrongPassword1!')
    expect(res.error?.code).toBe('DATABASE_ERROR')
  })

  // T-076 — un .update() direct était filtré en silence par la RLS : aucune erreur,
  // mais 0 ligne modifiée. La RPC renvoie explicitement false dans ce cas, et ça doit
  // désormais remonter comme un échec au lieu d'être pris pour un succès.
  it('returns DATABASE_ERROR when the RPC succeeds but updates no row', async () => {
    rpcMock.mockResolvedValue({ data: false, error: null })
    const res = await changeTemporaryPassword('StrongPassword1!')
    expect(res.error?.code).toBe('DATABASE_ERROR')
  })
})
