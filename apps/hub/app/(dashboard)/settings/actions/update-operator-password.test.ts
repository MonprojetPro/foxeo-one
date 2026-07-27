import { describe, it, expect, vi, beforeEach } from 'vitest'

const testAuthUserId = '550e8400-e29b-41d4-a716-446655440000'
const testEmail = 'contact@monprojet-pro.com'

const mockGetUser = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      updateUser: mockUpdateUser,
    },
  })),
}))

describe('updateOperatorPassword Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('retourne VALIDATION_ERROR si le nouveau mot de passe fait moins de 8 caractères', async () => {
    const { updateOperatorPassword } = await import('./update-operator-password')
    const result = await updateOperatorPassword({
      currentPassword: 'ancien-mdp',
      newPassword: 'court',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('retourne UNAUTHORIZED si personne n est authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const { updateOperatorPassword } = await import('./update-operator-password')
    const result = await updateOperatorPassword({
      currentPassword: 'ancien-mdp',
      newPassword: 'nouveau-mdp-12',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  // Test critique : refuse le changement si le mot de passe actuel est faux —
  // sinon quiconque a accès à une session déjà ouverte peut changer le mot de
  // passe sans jamais le connaître.
  it('refuse le changement si le mot de passe actuel est incorrect', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testAuthUserId, email: testEmail } },
      error: null,
    })
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    const { updateOperatorPassword } = await import('./update-operator-password')
    const result = await updateOperatorPassword({
      currentPassword: 'mauvais-mdp',
      newPassword: 'nouveau-mdp-12',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_CURRENT_PASSWORD')
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('change le mot de passe après re-authentification réussie', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testAuthUserId, email: testEmail } },
      error: null,
    })
    mockSignInWithPassword.mockResolvedValue({ data: { user: {} }, error: null })
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null })

    const { updateOperatorPassword } = await import('./update-operator-password')
    const result = await updateOperatorPassword({
      currentPassword: 'ancien-mdp',
      newPassword: 'nouveau-mdp-12',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ ok: true })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: testEmail,
      password: 'ancien-mdp',
    })
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'nouveau-mdp-12' })
  })

  it('retourne AUTH_ERROR si la mise à jour échoue malgré une re-authentification réussie', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testAuthUserId, email: testEmail } },
      error: null,
    })
    mockSignInWithPassword.mockResolvedValue({ data: { user: {} }, error: null })
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    })

    const { updateOperatorPassword } = await import('./update-operator-password')
    const result = await updateOperatorPassword({
      currentPassword: 'ancien-mdp',
      newPassword: 'nouveau-mdp-12',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_ERROR')
  })

  it('retourne toujours le format { data, error }', async () => {
    const { updateOperatorPassword } = await import('./update-operator-password')
    const result = await updateOperatorPassword({
      currentPassword: '',
      newPassword: 'court',
    })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
