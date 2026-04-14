import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsertSelect = vi.fn()
const mockSelectSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()

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

const mockFrom = vi.fn()

const OPERATOR_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const PARCOURS_ID = '00000000-0000-0000-0000-000000000003'
const TEMPLATE_ID = '00000000-0000-0000-0000-000000000004'
const MEETING_ID = '00000000-0000-0000-0000-000000000005'

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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const { createLabOnboarding } = await import('./create-lab-onboarding')
    const result = await createLabOnboarding(validInput)
    expect(result.error).toBeNull()
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.parcoursId).toBe(PARCOURS_ID)
    vi.unstubAllGlobals()
  })
})
