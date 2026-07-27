import { describe, it, expect, vi, beforeEach } from 'vitest'

const testAuthUserId = '550e8400-e29b-41d4-a716-446655440000'
const testOperatorId = '550e8400-e29b-41d4-a716-446655440099'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Chaîne de mocks pour supabase.from('operators')
const mockFetchSingle = vi.fn()
const mockFetchEq = vi.fn(() => ({ single: mockFetchSingle }))
const mockFetchSelect = vi.fn(() => ({ eq: mockFetchEq }))

const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockFrom = vi.fn(() => ({
  select: mockFetchSelect,
  update: mockUpdate,
}))

const mockGetUser = vi.fn()
const mockUpdateUserById = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
  createServiceRoleSupabaseClient: vi.fn(() => ({
    auth: { admin: { updateUserById: mockUpdateUserById } },
  })),
}))

describe('updateOperatorProfile Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('refuse un utilisateur non authentifié (UNAUTHORIZED)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ name: 'MiKL' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne NOT_FOUND si aucun opérateur ne correspond à auth_user_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockFetchSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ name: 'MiKL' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne VALIDATION_ERROR pour un email invalide', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockFetchSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'MiKL',
        email: 'contact@monprojet-pro.com',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ email: 'pas-un-email' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR quand ni name ni email ne sont fournis', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockFetchSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'MiKL',
        email: 'contact@monprojet-pro.com',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('change le nom seul — aucune synchro Auth déclenchée', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockFetchSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'Ancien Nom',
        email: 'contact@monprojet-pro.com',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'Nouveau Nom',
        email: 'contact@monprojet-pro.com',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ name: 'Nouveau Nom' })

    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Nouveau Nom')
    expect(result.data?.requiresReauth).toBe(false)
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it("change l'email — synchronise D'ABORD auth.users, puis la fiche operators", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockFetchSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'MiKL',
        email: 'ancien@foxeo.io',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })
    mockUpdateUserById.mockResolvedValue({ data: { user: {} }, error: null })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'MiKL',
        email: 'contact@monprojet-pro.com',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ email: 'contact@monprojet-pro.com' })

    expect(result.error).toBeNull()
    expect(result.data?.email).toBe('contact@monprojet-pro.com')
    expect(result.data?.requiresReauth).toBe(true)
    expect(mockUpdateUserById).toHaveBeenCalledWith(testAuthUserId, {
      email: 'contact@monprojet-pro.com',
      email_confirm: true,
    })
  })

  it("ne resynchronise PAS l'email si l'email soumis est identique à l'existant", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockFetchSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'MiKL',
        email: 'contact@monprojet-pro.com',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'MiKL',
        email: 'contact@monprojet-pro.com',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ email: 'contact@monprojet-pro.com' })

    expect(result.error).toBeNull()
    expect(result.data?.requiresReauth).toBe(false)
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  // Test le plus important : verrouille l'incident du 2026-07-27. Si la synchro
  // Auth échoue, la fiche `operators` ne doit JAMAIS être touchée — sinon
  // l'email de connexion (auth.users) et l'email métier (operators) divergent
  // de nouveau, et l'opérateur se retrouve bloqué dehors comme MiKL.
  it("n'update JAMAIS operators si la synchro Auth échoue", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockFetchSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'MiKL',
        email: 'ancien@foxeo.io',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })
    mockUpdateUserById.mockResolvedValue({
      data: null,
      error: { message: 'Email already registered' },
    })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ email: 'deja-pris@ailleurs.com' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_SYNC_ERROR')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('retourne DB_ERROR si la mise à jour de la fiche operators échoue', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockFetchSingle.mockResolvedValue({
      data: {
        id: testOperatorId,
        name: 'MiKL',
        email: 'contact@monprojet-pro.com',
        role: 'admin',
        two_factor_enabled: true,
      },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ name: 'Nouveau' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('retourne toujours le format { data, error }', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const { updateOperatorProfile } = await import('./update-operator-profile')
    const result = await updateOperatorProfile({ name: 'Test' })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
