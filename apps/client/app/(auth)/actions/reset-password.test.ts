import { describe, it, expect, vi, beforeEach } from 'vitest'

const updateUser = vi.fn()
const notificationsInsert = vi.fn().mockResolvedValue({ error: null })
const clientsMaybeSingle = vi.fn()

const fromMock = vi.fn((table: string) => {
  if (table === 'notifications') return { insert: notificationsInsert }
  if (table === 'clients') {
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: clientsMaybeSingle })) })) }
  }
  throw new Error(`unexpected table: ${table}`)
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { updateUser },
      from: fromMock,
    })
  ),
  buildHubHandoffLink: vi.fn(),
}))

import { resetPasswordAction } from './auth'

function formDataWith(password: string): FormData {
  const fd = new FormData()
  fd.set('password', password)
  return fd
}

describe('resetPasswordAction — T-078 (nouveau parcours d\'activation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null })
  })

  it('returns VALIDATION_ERROR for a password shorter than 8 characters', async () => {
    const result = await resetPasswordAction(formDataWith('short'))
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('returns AUTH_ERROR when supabase updateUser fails', async () => {
    updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'boom' } })
    const result = await resetPasswordAction(formDataWith('StrongPassword1'))
    expect(result.error?.code).toBe('AUTH_ERROR')
    expect(result.error?.message).toBe('boom')
  })

  // T-079 — constat MiKL du 10-11 : le message générique cachait la vraie raison
  // Supabase (protection anti-mot de passe-fuité, HaveIBeenPwned) et bloquait le test
  // du parcours One sans aucune piste.
  it('translates the leaked-password error into an explicit French message', async () => {
    updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password is known to be weak and easy to guess, please choose a different one.' },
    })
    const result = await resetPasswordAction(formDataWith('Testtest1'))
    expect(result.error?.code).toBe('AUTH_ERROR')
    expect(result.error?.message).toBe(
      'Ce mot de passe est trop commun ou a déjà fuité ailleurs sur le web — choisissez-en un autre.'
    )
  })

  // En plein onboarding (onboarding_completed=false) : on enchaîne sur la vérification
  // des coordonnées, pas directement sur le dashboard.
  it('returns nextPath=/onboarding/profile when onboarding is not completed', async () => {
    clientsMaybeSingle.mockResolvedValue({ data: { onboarding_completed: false }, error: null })
    const result = await resetPasswordAction(formDataWith('StrongPassword1'))
    expect(result.error).toBeNull()
    expect(result.data?.nextPath).toBe('/onboarding/profile')
  })

  // Cas "mot de passe oublié" classique (client déjà onboardé) : comportement inchangé.
  it('returns nextPath=/ when onboarding is already completed', async () => {
    clientsMaybeSingle.mockResolvedValue({ data: { onboarding_completed: true }, error: null })
    const result = await resetPasswordAction(formDataWith('StrongPassword1'))
    expect(result.error).toBeNull()
    expect(result.data?.nextPath).toBe('/')
  })

  it('returns nextPath=/ when the client row cannot be found (never blocks the reset)', async () => {
    clientsMaybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await resetPasswordAction(formDataWith('StrongPassword1'))
    expect(result.error).toBeNull()
    expect(result.data?.nextPath).toBe('/')
  })
})
