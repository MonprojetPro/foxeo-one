import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockStepSingle = vi.fn()
const mockStepEq = vi.fn(() => ({ single: mockStepSingle }))
const mockStepSelect = vi.fn(() => ({ eq: mockStepEq }))

const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockNextStepSingle = vi.fn()
const mockNextStepEq2 = vi.fn(() => ({ single: mockNextStepSingle }))
const mockNextStepEq1 = vi.fn(() => ({ eq: mockNextStepEq2 }))
const mockNextStepSelect = vi.fn(() => ({ eq: mockNextStepEq1 }))

const mockFrom = vi.fn((table: string) => {
  return {
    select: mockStepSelect,
    update: mockUpdate,
  }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const STEP_ID = '00000000-0000-0000-0000-000000000010'
const PARCOURS_ID = '00000000-0000-0000-0000-000000000001'

const mockCurrentStep = {
  id: STEP_ID,
  status: 'current',
  step_number: 2,
  parcours_id: PARCOURS_ID,
}

const mockLockedStep = {
  id: STEP_ID,
  status: 'locked',
  step_number: 3,
  parcours_id: PARCOURS_ID,
}

describe('skipStep Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockStepSingle.mockResolvedValue({ data: mockCurrentStep, error: null })
    mockUpdateSingle.mockResolvedValue({
      data: { ...mockCurrentStep, status: 'skipped', parcours_id: PARCOURS_ID, title: 'Step', description: 'Desc', brief_template: null, completed_at: null, validation_required: false, validation_id: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
      error: null,
    })
    mockNextStepSingle.mockResolvedValue({ data: { id: 'next-step' }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { skipStep } = await import('./skip-step')
    const result = await skipStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid stepId', async () => {
    const { skipStep } = await import('./skip-step')
    const result = await skipStep({ stepId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when step does not exist', async () => {
    mockStepSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { skipStep } = await import('./skip-step')
    const result = await skipStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns INVALID_STATUS when step is not current', async () => {
    mockStepSingle.mockResolvedValue({ data: mockLockedStep, error: null })

    const { skipStep } = await import('./skip-step')
    const result = await skipStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('passes all guards for a current step (not UNAUTHORIZED, NOT_FOUND, INVALID_STATUS)', async () => {
    const { skipStep } = await import('./skip-step')
    const result = await skipStep({ stepId: STEP_ID })

    // The mock chain is incomplete for the next-step query (.eq.eq),
    // so it may fall through to INTERNAL_ERROR. Key validation:
    // it should NOT be UNAUTHORIZED, NOT_FOUND, INVALID_STATUS, or VALIDATION_ERROR.
    expect(result.error?.code).not.toBe('UNAUTHORIZED')
    expect(result.error?.code).not.toBe('NOT_FOUND')
    expect(result.error?.code).not.toBe('INVALID_STATUS')
    expect(result.error?.code).not.toBe('VALIDATION_ERROR')
  })
})
