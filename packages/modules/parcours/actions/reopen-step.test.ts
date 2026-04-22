import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ReopenStepResult } from '../types/parcours.types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// operators (is_operator guard)
const mockOperatorMaybeSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ maybeSingle: mockOperatorMaybeSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

// parcours_steps select (get step)
const mockStepSingle = vi.fn()
const mockStepSelectEq = vi.fn(() => ({ single: mockStepSingle }))
const mockStepSelect = vi.fn(() => ({ eq: mockStepSelectEq }))

// parcours_steps update
const mockStepUpdateEq = vi.fn(() => ({}))
const mockStepUpdate = vi.fn(() => ({ eq: mockStepUpdateEq }))

// parcours select (get client_id)
const mockParcoursSingle = vi.fn()
const mockParcoursSelectEq = vi.fn(() => ({ single: mockParcoursSingle }))
const mockParcoursSelect = vi.fn(() => ({ eq: mockParcoursSelectEq }))

// step_submissions select (last approved)
const mockSubMaybeSingle = vi.fn()
const mockSubLimit = vi.fn(() => ({ maybeSingle: mockSubMaybeSingle }))
const mockSubOrder = vi.fn(() => ({ limit: mockSubLimit }))
const mockSubEqStatus = vi.fn(() => ({ order: mockSubOrder }))
const mockSubEqStep = vi.fn(() => ({ eq: mockSubEqStatus }))
const mockSubSelect = vi.fn(() => ({ eq: mockSubEqStep }))

// step_submissions update
const mockSubUpdateEq = vi.fn(() => ({}))
const mockSubUpdate = vi.fn(() => ({ eq: mockSubUpdateEq }))

// notifications insert
const mockNotifInsert = vi.fn(() => ({}))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOperatorSelect }
  if (table === 'parcours_steps') {
    return {
      select: mockStepSelect,
      update: mockStepUpdate,
    }
  }
  if (table === 'parcours') return { select: mockParcoursSelect }
  if (table === 'step_submissions') {
    return {
      select: mockSubSelect,
      update: mockSubUpdate,
    }
  }
  if (table === 'notifications') return { insert: mockNotifInsert }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ID = '00000000-0000-0000-0000-000000000010'
const PARCOURS_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000099'
const SUBMISSION_ID = '00000000-0000-0000-0000-000000000055'

const mockStep = {
  id: STEP_ID,
  step_number: 2,
  title: 'Étape 2 — Brief',
  status: 'completed',
  parcours_id: PARCOURS_ID,
}

const mockParcours = {
  client_id: CLIENT_ID,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('reopenStep — guards auth & operator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-user-id' } }, error: null })
    mockOperatorMaybeSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockStepSingle.mockResolvedValue({ data: mockStep, error: null })
    mockParcoursSingle.mockResolvedValue({ data: mockParcours, error: null })
    mockSubMaybeSingle.mockResolvedValue({ data: { id: SUBMISSION_ID }, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { reopenStep } = await import('./reopen-step')
    const result: ActionResponse<ReopenStepResult> = await reopenStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    mockOperatorMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { reopenStep } = await import('./reopen-step')
    const result = await reopenStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
    expect(result.error?.message).toBe('Accès refusé')
  })

  it('returns VALIDATION_ERROR for invalid stepId', async () => {
    const { reopenStep } = await import('./reopen-step')
    const result = await reopenStep({ stepId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})

describe('reopenStep — status guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-user-id' } }, error: null })
    mockOperatorMaybeSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockParcoursSingle.mockResolvedValue({ data: mockParcours, error: null })
    mockSubMaybeSingle.mockResolvedValue({ data: { id: SUBMISSION_ID }, error: null })
  })

  it('returns INVALID_STATUS when step is not completed', async () => {
    mockStepSingle.mockResolvedValue({
      data: { ...mockStep, status: 'current' },
      error: null,
    })

    const { reopenStep } = await import('./reopen-step')
    const result = await reopenStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
    expect(result.error?.message).toBe('Seule une étape complétée peut être rouverte')
  })

  it('returns INVALID_STATUS when step is locked', async () => {
    mockStepSingle.mockResolvedValue({
      data: { ...mockStep, status: 'locked' },
      error: null,
    })

    const { reopenStep } = await import('./reopen-step')
    const result = await reopenStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('returns NOT_FOUND when step does not exist', async () => {
    mockStepSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { reopenStep } = await import('./reopen-step')
    const result = await reopenStep({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})

describe('reopenStep — success workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-user-id' } }, error: null })
    mockOperatorMaybeSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockStepSingle.mockResolvedValue({ data: mockStep, error: null })
    mockParcoursSingle.mockResolvedValue({ data: mockParcours, error: null })
    mockSubMaybeSingle.mockResolvedValue({ data: { id: SUBMISSION_ID }, error: null })
  })

  it('returns reopened=true on success', async () => {
    const { reopenStep } = await import('./reopen-step')
    const result = await reopenStep({ stepId: STEP_ID })

    expect(result.error).toBeNull()
    expect(result.data?.reopened).toBe(true)
  })

  it('updates parcours_steps to current with null completed_at and validation_id', async () => {
    const { reopenStep } = await import('./reopen-step')
    await reopenStep({ stepId: STEP_ID })

    expect(mockStepUpdate).toHaveBeenCalledWith({
      status: 'current',
      completed_at: null,
      validation_id: null,
    })
    expect(mockStepUpdateEq).toHaveBeenCalledWith('id', STEP_ID)
  })

  it('updates last approved submission to revision_requested', async () => {
    const { reopenStep } = await import('./reopen-step')
    await reopenStep({ stepId: STEP_ID })

    expect(mockSubUpdate).toHaveBeenCalledWith({ status: 'revision_requested' })
    expect(mockSubUpdateEq).toHaveBeenCalledWith('id', SUBMISSION_ID)
  })

  it('inserts notification for client', async () => {
    const { reopenStep } = await import('./reopen-step')
    await reopenStep({ stepId: STEP_ID })

    expect(mockNotifInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_type: 'client',
        recipient_id: CLIENT_ID,
        type: 'info',
      })
    )
  })

  it('includes reason in notification body when provided', async () => {
    const { reopenStep } = await import('./reopen-step')
    await reopenStep({ stepId: STEP_ID, reason: 'Merci de corriger le brief' })

    expect(mockNotifInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Merci de corriger le brief'),
      })
    )
  })

  it('sends notification without reason when none provided', async () => {
    const { reopenStep } = await import('./reopen-step')
    await reopenStep({ stepId: STEP_ID })

    expect(mockNotifInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('étape 2'),
      })
    )
  })

  it('does not affect other steps (no cascade)', async () => {
    const { reopenStep } = await import('./reopen-step')
    await reopenStep({ stepId: STEP_ID })

    // Only 1 call to step update (for stepId only)
    expect(mockStepUpdate).toHaveBeenCalledTimes(1)
    expect(mockStepUpdateEq).toHaveBeenCalledWith('id', STEP_ID)
  })

  it('succeeds even when no approved submission exists', async () => {
    mockSubMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { reopenStep } = await import('./reopen-step')
    const result = await reopenStep({ stepId: STEP_ID })

    expect(result.error).toBeNull()
    expect(result.data?.reopened).toBe(true)
    // No submission update called
    expect(mockSubUpdate).not.toHaveBeenCalled()
  })
})
