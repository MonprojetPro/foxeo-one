import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { CompleteStepResult } from '../types/parcours.types'
import { ParcoursStepStatusValues } from '../types/parcours.types'

const mockGetUser = vi.fn()

// step query (with select)
const mockStepSingle = vi.fn()
const mockStepEq = vi.fn(() => ({ single: mockStepSingle }))
const mockStepSelect = vi.fn(() => ({ eq: mockStepEq }))

// update chain
const mockUpdateSingle = vi.fn()
const mockUpdateSelectChain = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelectChain, eq: vi.fn(() => ({})) }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

// next step query
const mockNextStepSingle = vi.fn()
const mockNextStepEq2 = vi.fn(() => ({ single: mockNextStepSingle }))
const mockNextStepEq1 = vi.fn(() => ({ eq: mockNextStepEq2 }))
const mockNextStepSelect = vi.fn(() => ({ eq: mockNextStepEq1 }))

// notifications insert
const mockInsert = vi.fn()
const mockNotifInsert = vi.fn(() => ({ ...mockInsert() }))

// parcours update for completion
const mockParcoursUpdateEq = vi.fn(() => ({}))
const mockParcoursUpdate = vi.fn(() => ({ eq: mockParcoursUpdateEq }))

// clients select for operator_id
const mockClientsSingle = vi.fn()
const mockClientsEq = vi.fn(() => ({ single: mockClientsSingle }))
const mockClientsSelect = vi.fn(() => ({ eq: mockClientsEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'parcours_steps') {
    return {
      select: mockStepSelect,
      update: mockUpdate,
    }
  }
  if (table === 'parcours') return { update: mockParcoursUpdate }
  if (table === 'clients') return { select: mockClientsSelect }
  if (table === 'notifications') return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const STEP_ID = '00000000-0000-0000-0000-000000000010'
const PARCOURS_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const NEXT_STEP_ID = '00000000-0000-0000-0000-000000000011'

const mockStep = {
  id: STEP_ID,
  parcours_id: PARCOURS_ID,
  step_number: 1,
  title: 'Étape 1',
  description: 'Description',
  brief_template: null,
  status: 'current',
  completed_at: null,
  validation_required: true,
  validation_id: '00000000-0000-0000-0000-000000000099', // validated
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  parcours: { id: PARCOURS_ID, client_id: CLIENT_ID },
}

const mockNextStep = { id: NEXT_STEP_ID }

describe('completeStep Server Action — progression logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockStepSingle.mockResolvedValue({ data: mockStep, error: null })
    // Update step: mark as completed
    mockUpdateEq.mockReturnValue({
      eq: vi.fn(() => ({})), // for other eq calls
    })
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })
    mockNextStepSingle.mockResolvedValue({ data: mockNextStep, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { completeStep } = await import('./complete-step')
    const result: ActionResponse<CompleteStepResult> = await completeStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid stepId', async () => {
    const { completeStep } = await import('./complete-step')
    const result = await completeStep({ stepId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when step does not exist', async () => {
    mockStepSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { completeStep } = await import('./complete-step')
    const result = await completeStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns INVALID_STATUS when step is not current (e.g. locked)', async () => {
    const lockedStep = { ...mockStep, status: 'locked' }
    mockStepSingle.mockResolvedValue({ data: lockedStep, error: null })

    const { completeStep } = await import('./complete-step')
    const result = await completeStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('returns INVALID_STATUS when step is already completed', async () => {
    const completedStep = { ...mockStep, status: 'completed' }
    mockStepSingle.mockResolvedValue({ data: completedStep, error: null })

    const { completeStep } = await import('./complete-step')
    const result = await completeStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('returns VALIDATION_REQUIRED when step requires validation but has none', async () => {
    const stepWithoutValidation = { ...mockStep, validation_required: true, validation_id: null }
    mockStepSingle.mockResolvedValue({ data: stepWithoutValidation, error: null })

    const { completeStep } = await import('./complete-step')
    const result = await completeStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_REQUIRED')
  })

  it('allows completing step when validation_required is false', async () => {
    const stepNoValidation = { ...mockStep, validation_required: false, validation_id: null }
    mockStepSingle.mockResolvedValue({ data: stepNoValidation, error: null })

    const { completeStep } = await import('./complete-step')
    const result = await completeStep({ stepId: STEP_ID })

    // Should not return VALIDATION_REQUIRED error
    expect(result.error?.code).not.toBe('VALIDATION_REQUIRED')
  })
})

describe('completeStep — unlock next step logic (AC5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockStepSingle.mockResolvedValue({ data: mockStep, error: null })
  })

  it('ParcoursStepStatusValues covers all DB status values', () => {
    expect(ParcoursStepStatusValues).toContain('locked')
    expect(ParcoursStepStatusValues).toContain('current')
    expect(ParcoursStepStatusValues).toContain('completed')
    expect(ParcoursStepStatusValues).toContain('skipped')
    expect(ParcoursStepStatusValues).toHaveLength(4)
  })
})
