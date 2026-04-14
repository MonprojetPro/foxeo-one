import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
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

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const STEP_ID = '00000000-0000-0000-0000-000000000010'

describe('updateStepStatus Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockFetchSingle.mockResolvedValue({
      data: { id: STEP_ID, status: 'locked' },
      error: null,
    })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: STEP_ID, parcours_id: 'p1', step_number: 1, title: 'Step', description: 'Desc',
        brief_template: null, status: 'current', completed_at: null,
        validation_required: true, validation_id: null,
        created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { updateStepStatus } = await import('./update-step-status')
    const result = await updateStepStatus({ stepId: STEP_ID, status: 'current' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid stepId', async () => {
    const { updateStepStatus } = await import('./update-step-status')
    const result = await updateStepStatus({ stepId: 'bad', status: 'current' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when step does not exist', async () => {
    mockFetchSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { updateStepStatus } = await import('./update-step-status')
    const result = await updateStepStatus({ stepId: STEP_ID, status: 'current' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('allows valid transition: locked → current', async () => {
    mockFetchSingle.mockResolvedValue({ data: { id: STEP_ID, status: 'locked' }, error: null })

    const { updateStepStatus } = await import('./update-step-status')
    const result = await updateStepStatus({ stepId: STEP_ID, status: 'current' })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('current')
  })

  it('rejects invalid transition: locked → completed', async () => {
    mockFetchSingle.mockResolvedValue({ data: { id: STEP_ID, status: 'locked' }, error: null })

    const { updateStepStatus } = await import('./update-step-status')
    const result = await updateStepStatus({ stepId: STEP_ID, status: 'completed' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_TRANSITION')
  })

  it('rejects invalid transition: locked → skipped', async () => {
    mockFetchSingle.mockResolvedValue({ data: { id: STEP_ID, status: 'locked' }, error: null })

    const { updateStepStatus } = await import('./update-step-status')
    const result = await updateStepStatus({ stepId: STEP_ID, status: 'skipped' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_TRANSITION')
  })

  it('allows valid transition: current → completed', async () => {
    mockFetchSingle.mockResolvedValue({ data: { id: STEP_ID, status: 'current' }, error: null })
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: STEP_ID, parcours_id: 'p1', step_number: 1, title: 'Step', description: 'Desc',
        brief_template: null, status: 'completed', completed_at: '2026-02-01T00:00:00.000Z',
        validation_required: true, validation_id: null,
        created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-02-01T00:00:00.000Z',
      },
      error: null,
    })

    const { updateStepStatus } = await import('./update-step-status')
    const result = await updateStepStatus({ stepId: STEP_ID, status: 'completed' })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('completed')
  })
})
