import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsertSelect = vi.fn()
const mockSelectSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()
const mockNotificationsInsert = vi.fn()

// Chain builders
const makeInsertChain = () => ({
  insert: vi.fn(() => ({
    select: vi.fn(() => ({ single: mockInsertSelect })),
  })),
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// L'action délègue la création du compte Auth client au même utilitaire que le tunnel
// Pennylane (cf. pennylane-paid-handlers.ts) — mocké ici pour isoler le test de l'API
// Supabase admin réelle.
const mockCreateClientAuthUser = vi.fn()
vi.mock('@monprojetpro/supabase/admin', () => ({
  createClientAuthUser: (...args: unknown[]) => mockCreateClientAuthUser(...args),
  generateSecureTemporaryPassword: () => 'temp-password-for-tests',
}))

const mockFrom = vi.fn()

const OPERATOR_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const PARCOURS_ID = '00000000-0000-0000-0000-000000000003'
const TEMPLATE_ID = '00000000-0000-0000-0000-000000000004'
const MEETING_ID = '00000000-0000-0000-0000-000000000005'
const AUTH_USER_ID = '00000000-0000-0000-0000-000000000006'

const validInput = {
  meetingId: MEETING_ID,
  clientName: 'Alice Dupont',
  clientEmail: 'alice@example.com',
  parcoursTemplateId: TEMPLATE_ID,
}

describe('createLabOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    // Default: la création du compte Auth client réussit
    mockCreateClientAuthUser.mockResolvedValue({ userId: AUTH_USER_ID, error: null })
    mockNotificationsInsert.mockResolvedValue({ error: null })

    // Default chain setup
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }) })) })) }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: CLIENT_ID }, error: null }) })),
          })),
        }
      }
      if (table === 'parcours_templates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: TEMPLATE_ID, name: 'Parcours Complet', stages: [] }, error: null }),
            })),
          })),
        }
      }
      if (table === 'parcours') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: PARCOURS_ID }, error: null }) })),
          })),
        }
      }
      if (table === 'meetings') {
        return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }
      }
      if (table === 'notifications') {
        return { insert: mockNotificationsInsert }
      }
      return {}
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding(validInput)
    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(result.data).toBeNull()
  })

  it('returns VALIDATION_ERROR for invalid email', async () => {
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding({ ...validInput, clientEmail: 'not-an-email' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for invalid UUID', async () => {
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding({ ...validInput, parcoursTemplateId: 'not-a-uuid' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when operator not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) })) })) }
      }
      return {}
    })
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding(validInput)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns CONFLICT when client email already exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }) })) })) }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-id' }, error: null }) })),
            })),
          })),
        }
      }
      return {}
    })
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding(validInput)
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('returns clientId and parcoursId on success', async () => {
    // Use the default mocks set in beforeEach
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding(validInput)
    expect(result.error).toBeNull()
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.parcoursId).toBe(PARCOURS_ID)
    vi.unstubAllGlobals()
  })

  it('creates the client auth account before creating the client row (BUG FIX)', async () => {
    // Réparation du flow visio→Lab (docs/lab-one-lifecycle.md §8.1) : sans compte Auth
    // créé ici, l'invitation envoyée plus tard par launchClientParcours (generateLink de
    // type 'recovery') échouerait car l'email ne correspondrait à aucun compte existant.
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding(validInput)
    expect(result.error).toBeNull()
    expect(mockCreateClientAuthUser).toHaveBeenCalledWith({
      email: validInput.clientEmail,
      password: 'temp-password-for-tests',
    })
  })

  it('does NOT send the welcome-lab email at creation time (BUG FIX)', async () => {
    // C'était le bug : l'email d'accès partait immédiatement, avant qu'aucun parcours
    // d'agents Élio ne soit composé → le client tombait sur un espace vide. Désormais
    // l'email part uniquement au lancement du parcours (launchClientParcours), jamais ici.
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    await createLabOnboarding(validInput)
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('notifies the operator that the parcours still needs to be composed', async () => {
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    await createLabOnboarding(validInput)
    expect(mockNotificationsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_type: 'operator',
        recipient_id: OPERATOR_ID, // = user.id (l'opérateur authentifié), jamais clients.id
        type: 'alert',
        title: expect.any(String),
        body: expect.stringContaining(validInput.clientName),
      })
    )
  })

  it('returns AUTH_ERROR and creates no client when the auth account creation fails', async () => {
    mockCreateClientAuthUser.mockResolvedValue({
      userId: null,
      error: { code: 'AUTH_ADMIN_CREATE_FAILED', message: 'boom' },
    })
    const clientsInsert = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }) })) })) }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
            })),
          })),
          insert: clientsInsert,
        }
      }
      return {}
    })
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding(validInput)
    expect(result.error?.code).toBe('AUTH_ERROR')
    expect(result.data).toBeNull()
    expect(clientsInsert).not.toHaveBeenCalled()
  })
})
