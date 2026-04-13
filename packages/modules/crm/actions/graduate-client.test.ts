import { describe, it, expect, vi, beforeEach } from 'vitest'

const CLIENT_UUID = '550e8400-e29b-41d4-a716-446655440000'
const OPERATOR_UUID = '550e8400-e29b-41d4-a716-446655440001'
const AUTH_UUID = '550e8400-e29b-41d4-a716-446655440099'

// Mocks
const mockGetUser = vi.fn()
const mockOpSingle = vi.fn()
const mockClientSingle = vi.fn()
const mockConfigSingle = vi.fn()
const mockParcoursMaybeSingle = vi.fn()
const mockActivityInsert = vi.fn().mockResolvedValue({ error: null })
const mockClientsUpdate = vi.fn()
const mockConfigUpdate = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockOpSingle })) })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: mockClientSingle })),
            })),
          })),
          update: mockClientsUpdate,
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockConfigSingle })),
          })),
          update: mockConfigUpdate,
        }
      }
      if (table === 'parcours') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: mockParcoursMaybeSingle })),
          })),
        }
      }
      if (table === 'validation_requests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        }
      }
      if (table === 'activity_logs') {
        return { insert: mockActivityInsert }
      }
      return {}
    }),
  })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const validInput = {
  clientId: CLIENT_UUID,
  tier: 'essentiel' as const,
  activeModules: ['core-dashboard', 'chat'],
  notes: 'Graduation réussie',
}

describe('graduateClient Server Action — ADR-01 Révision 2 (multi-tenant)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_UUID } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: OPERATOR_UUID }, error: null })

    // Default: conditions met
    mockClientSingle.mockResolvedValue({
      data: { id: CLIENT_UUID, operator_id: OPERATOR_UUID },
      error: null,
    })
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'lab' },
      error: null,
    })
    mockParcoursMaybeSingle.mockResolvedValue({
      data: { status: 'termine', active_stages: [] },
      error: null,
    })

    // Update chains
    mockClientsUpdate.mockReturnValue({
      eq: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    })
    mockConfigUpdate.mockReturnValue({
      eq: vi.fn(() => ({ error: null })),
    })
  })

  it('should return INVALID_INPUT for invalid UUID', async () => {
    const { graduateClient } = await import('./graduate-client')
    const result = await graduateClient({
      clientId: 'not-a-uuid',
      tier: 'essentiel',
      activeModules: ['core-dashboard'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return INVALID_INPUT when no modules selected', async () => {
    const { graduateClient } = await import('./graduate-client')
    const result = await graduateClient({
      clientId: CLIENT_UUID,
      tier: 'essentiel',
      activeModules: [],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return UNAUTHORIZED when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } })

    const { graduateClient } = await import('./graduate-client')
    const result = await graduateClient(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return GRADUATION_CONDITIONS_NOT_MET when dashboard_type is already one', async () => {
    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'one' },
      error: null,
    })

    const { graduateClient } = await import('./graduate-client')
    const result = await graduateClient(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('GRADUATION_CONDITIONS_NOT_MET')
    expect(result.error?.message).toContain('déjà en statut One')
  })

  it('should return GRADUATION_CONDITIONS_NOT_MET when parcours not completed', async () => {
    mockParcoursMaybeSingle.mockResolvedValue({
      data: {
        status: 'en_cours',
        active_stages: [
          { active: true, status: 'in_progress' },
          { active: true, status: 'completed' },
        ],
      },
      error: null,
    })

    const { graduateClient } = await import('./graduate-client')
    const result = await graduateClient(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('GRADUATION_CONDITIONS_NOT_MET')
    expect(result.error?.message).toContain('Parcours non terminé')
  })

  it('should return GRADUATION_CONDITIONS_NOT_MET when validation requests pending', async () => {
    const supabaseMock = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: AUTH_UUID } }, error: null }) },
      from: vi.fn((table: string) => {
        if (table === 'operators') {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_UUID }, error: null }) })) })) }
        }
        if (table === 'clients') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: { id: CLIENT_UUID, operator_id: OPERATOR_UUID }, error: null }),
                })),
              })),
            })),
            update: mockClientsUpdate,
          }
        }
        if (table === 'client_configs') {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { dashboard_type: 'lab' }, error: null }) })) })) }
        }
        if (table === 'parcours') {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'termine', active_stages: [] }, error: null }) })) })) }
        }
        if (table === 'validation_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'vr-1' }],
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }),
    }

    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(supabaseMock as never)

    const { graduateClient } = await import('./graduate-client')
    const result = await graduateClient(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('GRADUATION_CONDITIONS_NOT_MET')
    expect(result.error?.message).toContain('Demandes de validation en attente')
  })

  it('should successfully graduate a client when all conditions met', async () => {
    const { graduateClient } = await import('./graduate-client')
    const result = await graduateClient(validInput)

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(result.data?.clientId).toBe(CLIENT_UUID)
    expect(result.data?.status).toBe('graduated')
  })

  it('should pass the new toggle flags lab_mode_available=true and elio_lab_enabled=false to client_configs update', async () => {
    let capturedConfigUpdate: Record<string, unknown> | null = null
    mockConfigUpdate.mockImplementation((payload: Record<string, unknown>) => {
      capturedConfigUpdate = payload
      return { eq: vi.fn(() => ({ error: null })) }
    })

    const { graduateClient } = await import('./graduate-client')
    await graduateClient(validInput)

    expect(capturedConfigUpdate).toBeTruthy()
    expect(capturedConfigUpdate).toMatchObject({
      dashboard_type: 'one',
      lab_mode_available: true,
      elio_lab_enabled: false,
      graduation_source: 'lab',
    })
  })

  it('should NOT touch the deprecated client_instances table (multi-tenant model)', async () => {
    let touchedClientInstances = false
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const originalImpl = vi.mocked(createServerSupabaseClient).getMockImplementation()

    vi.mocked(createServerSupabaseClient).mockImplementationOnce(async () => {
      const original = await (originalImpl?.() as Promise<unknown>)
      const proxied = original as { from: (table: string) => unknown }
      const wrappedFrom = (table: string) => {
        if (table === 'client_instances') {
          touchedClientInstances = true
        }
        return proxied.from(table)
      }
      return { ...(proxied as object), from: wrappedFrom } as never
    })

    const { graduateClient } = await import('./graduate-client')
    await graduateClient(validInput)

    expect(touchedClientInstances).toBe(false)
  })

  it('should return GRADUATION_ERROR when clients update fails and rollback', async () => {
    mockClientsUpdate.mockReturnValue({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ error: { message: 'DB error', code: '500' } })),
      })),
    })

    const { graduateClient } = await import('./graduate-client')
    const result = await graduateClient(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('GRADUATION_ERROR')
    expect(result.error?.message).toContain('Erreur lors de la graduation')
  })
})
