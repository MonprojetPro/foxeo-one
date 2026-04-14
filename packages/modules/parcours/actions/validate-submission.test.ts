import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ValidateSubmissionResult } from '../types/parcours.types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// step_submissions select
const mockSubmissionSingle = vi.fn()
const mockSubmissionEq = vi.fn(() => ({ single: mockSubmissionSingle }))
const mockSubmissionSelect = vi.fn(() => ({ eq: mockSubmissionEq }))

// step_submissions update
const mockSubmissionUpdateEq = vi.fn(() => ({}))
const mockSubmissionUpdate = vi.fn(() => ({ eq: mockSubmissionUpdateEq }))

// parcours_steps update
const mockStepUpdateEq = vi.fn(() => ({}))
const mockStepUpdate = vi.fn(() => ({ eq: mockStepUpdateEq }))

// parcours_steps next step
const mockNextStepMaybeSingle = vi.fn()
const mockNextStepEq2 = vi.fn(() => ({ maybeSingle: mockNextStepMaybeSingle }))
const mockNextStepEq1 = vi.fn(() => ({ eq: mockNextStepEq2 }))
const mockNextStepSelect = vi.fn(() => ({ eq: mockNextStepEq1 }))

// notifications insert
const mockNotifInsert = vi.fn(() => ({}))

const mockFrom = vi.fn((table: string) => {
  if (table === 'step_submissions') {
    return {
      select: mockSubmissionSelect,
      update: mockSubmissionUpdate,
    }
  }
  if (table === 'parcours_steps') {
    return {
      select: mockNextStepSelect,
      update: mockStepUpdate,
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

const SUBMISSION_ID = '00000000-0000-0000-0000-000000000099'
const STEP_ID = '00000000-0000-0000-0000-000000000010'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const NEXT_STEP_ID = '00000000-0000-0000-0000-000000000011'

const mockSubmission = {
  id: SUBMISSION_ID,
  client_id: CLIENT_ID,
  status: 'pending',
  parcours_steps: {
    id: STEP_ID,
    step_number: 1,
    title: 'Étape 1',
    parcours_id: '00000000-0000-0000-0000-000000000001',
  },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('validateSubmission Server Action — auth & validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-user-id' } }, error: null })
    mockSubmissionSingle.mockResolvedValue({ data: mockSubmission, error: null })
    mockNextStepMaybeSingle.mockResolvedValue({ data: { id: NEXT_STEP_ID }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { validateSubmission } = await import('./validate-submission')
    const result: ActionResponse<ValidateSubmissionResult> = await validateSubmission({
      submissionId: SUBMISSION_ID,
      decision: 'approved',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid submissionId', async () => {
    const { validateSubmission } = await import('./validate-submission')
    const result = await validateSubmission({ submissionId: 'not-a-uuid', decision: 'approved' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR when revision_requested without feedback', async () => {
    const { validateSubmission } = await import('./validate-submission')
    const result = await validateSubmission({
      submissionId: SUBMISSION_ID,
      decision: 'revision_requested',
      // no feedback
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR when rejected without feedback', async () => {
    const { validateSubmission } = await import('./validate-submission')
    const result = await validateSubmission({
      submissionId: SUBMISSION_ID,
      decision: 'rejected',
      // no feedback
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when submission does not exist', async () => {
    mockSubmissionSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { validateSubmission } = await import('./validate-submission')
    const result = await validateSubmission({ submissionId: SUBMISSION_ID, decision: 'approved' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})

describe('validateSubmission — approved workflow (AC5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-user-id' } }, error: null })
    mockSubmissionSingle.mockResolvedValue({ data: mockSubmission, error: null })
    mockNextStepMaybeSingle.mockResolvedValue({ data: { id: NEXT_STEP_ID }, error: null })
  })

  it('approves submission and returns stepCompleted=true', async () => {
    const { validateSubmission } = await import('./validate-submission')
    const result = await validateSubmission({ submissionId: SUBMISSION_ID, decision: 'approved' })

    expect(result.error).toBeNull()
    expect(result.data?.stepCompleted).toBe(true)
  })

  it('calls update on parcours_steps to complete the step when approved', async () => {
    const { validateSubmission } = await import('./validate-submission')
    await validateSubmission({ submissionId: SUBMISSION_ID, decision: 'approved' })

    expect(mockStepUpdate).toHaveBeenCalled()
  })
})

describe('validateSubmission — revision_requested & rejected workflow (AC5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'operator-user-id' } }, error: null })
    mockSubmissionSingle.mockResolvedValue({ data: mockSubmission, error: null })
  })

  it('revision_requested returns stepCompleted=false', async () => {
    const { validateSubmission } = await import('./validate-submission')
    const result = await validateSubmission({
      submissionId: SUBMISSION_ID,
      decision: 'revision_requested',
      feedback: 'Merci de retravailler cette partie.',
    })

    expect(result.error).toBeNull()
    expect(result.data?.stepCompleted).toBe(false)
  })

  it('rejected with feedback returns stepCompleted=false', async () => {
    const { validateSubmission } = await import('./validate-submission')
    const result = await validateSubmission({
      submissionId: SUBMISSION_ID,
      decision: 'rejected',
      feedback: 'Ce travail ne correspond pas aux attentes.',
    })

    expect(result.error).toBeNull()
    expect(result.data?.stepCompleted).toBe(false)
  })

  it('approved without feedback does not require feedback', async () => {
    mockNextStepMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { validateSubmission } = await import('./validate-submission')
    const result = await validateSubmission({
      submissionId: SUBMISSION_ID,
      decision: 'approved',
    })

    expect(result.error).toBeNull()
    expect(result.data?.stepCompleted).toBe(true)
  })
})
