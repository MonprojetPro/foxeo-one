import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@monprojetpro/types', () => ({
  successResponse: vi.fn((data) => ({ data, error: null })),
  errorResponse: vi.fn((message, code, details?) => ({
    data: null,
    error: { message, code, details },
  })),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { forgotPasswordAction } from './auth'

const mockSupabase = {
  auth: {
    resetPasswordForEmail: vi.fn(),
  },
}

function formDataWith(email: string) {
  const fd = new FormData()
  fd.set('email', email)
  return fd
}

describe('forgotPasswordAction — lien de réinitialisation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
  })

  function capturedRedirect(): string {
    const [, options] = mockSupabase.auth.resetPasswordForEmail.mock.calls[0]!
    return (options as { redirectTo: string }).redirectTo
  }

  it('envoie un lien ABSOLU vers /auth/callback', async () => {
    await forgotPasswordAction(formDataWith('client@monprojet-pro.com'))

    const redirectTo = capturedRedirect()
    expect(redirectTo).toMatch(/^https?:\/\//)
    expect(redirectTo).toContain('/auth/callback?next=/reset-password')
  })

  it("ne construit jamais un lien vers localhost ni une URL relative", async () => {
    // Régression 2026-08-01 : `NEXT_PUBLIC_APP_URL ?? ''` produisait une URL
    // relative — Supabase la rejetait et le client atterrissait sur l'accueil
    // sans jamais pouvoir changer son mot de passe.
    delete process.env.NEXT_PUBLIC_CLIENT_URL

    await forgotPasswordAction(formDataWith('client@monprojet-pro.com'))

    const redirectTo = capturedRedirect()
    expect(redirectTo).not.toContain('localhost')
    expect(redirectTo.startsWith('/')).toBe(false)
  })

  it('rejette un email invalide sans appeler Supabase', async () => {
    const result = await forgotPasswordAction(formDataWith('pas-un-email'))

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })
})
