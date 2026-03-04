import { describe, it, expect, vi, beforeEach } from 'vitest'

const CLIENT_UUID = '550e8400-e29b-41d4-a716-446655440000'
const OPERATOR_UUID = '550e8400-e29b-41d4-a716-446655440001'
const AUTH_UUID = '550e8400-e29b-41d4-a716-446655440099'
const INSTANCE_UUID = '550e8400-e29b-41d4-a716-446655440002'

// Mocks
const mockGetUser = vi.fn()
const mockOpSingle = vi.fn()
const mockClientSingle = vi.fn()
const mockClientCompanySingle = vi.fn()
const mockConfigSingle = vi.fn()
const mockParcoursMaybeSingle = vi.fn()
const mockValidationSelect = vi.fn()
const mockActivityInsert = vi.fn().mockResolvedValue({ error: null })
const mockInstanceInsert = vi.fn()
const mockInstanceUpdate = vi.fn()
const mockClientsUpdate = vi.fn()
const mockConfigUpdate = vi.fn()

// eq chain builder
function makeEqChain(finalFn: () => unknown) {
  const chain = {
    eq: vi.fn(() => chain),
    single: vi.fn(finalFn),
    maybeSingle: vi.fn(finalFn),
    select: vi.fn(() => chain),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(finalFn) })) })),
    update: vi.fn(() => chain),
  }
  return chain
}

vi.mock('@foxeo/supabase', () => ({
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
          select: vi.fn((fields: string) => {
            if (fields === 'id, operator_id') {
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({ single: mockClientSingle })),
                })),
              }
            }
            // 'company' select
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({ single: mockClientCompanySingle })),
              })),
            }
          }),
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
      if (table === 'client_instances') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          })),
          insert: mockInstanceInsert,
          update: mockInstanceUpdate,
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

vi.mock('../utils/provision-instance', () => ({
  provisionOneInstance: vi.fn().mockResolvedValue({
    data: {
      clientId: CLIENT_UUID,
      instanceId: INSTANCE_UUID,
      status: 'active',
      instanceUrl: 'https://acme-corp.foxeo.io',
      slug: 'acme-corp',
    },
    error: null,
  }),
}))

vi.mock('./migrate-lab-data', () => ({
  migrateLabDataToOne: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))

const validInput = {
  clientId: CLIENT_UUID,
  tier: 'essentiel' as const,
  activeModules: ['core-dashboard', 'chat'],
  notes: 'Graduation réussie',
}

describe('graduateClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_UUID } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: OPERATOR_UUID }, error: null })

    // Default: conditions met
    mockClientSingle.mockResolvedValue({
      data: { id: CLIENT_UUID, operator_id: OPERATOR_UUID },
      error: null,
    })
    mockClientCompanySingle.mockResolvedValue({
      data: { company: 'Acme Corp' },
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
    mockInstanceInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: INSTANCE_UUID },
          error: null,
        }),
      })),
    })
    mockInstanceUpdate.mockReturnValue({
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

    const { createServerSupabaseClient } = await import('@foxeo/supabase')
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
    expect(result.data?.status).toBe('active')
    expect(result.data?.slug).toBe('acme-corp')
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
