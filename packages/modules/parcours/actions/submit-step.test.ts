import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { SubmitStepResult } from '../types/parcours.types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// clients query
const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

// parcours_steps query
const mockStepSingle = vi.fn()
const mockStepEq = vi.fn(() => ({ single: mockStepSingle }))
const mockStepSelect = vi.fn(() => ({ eq: mockStepEq }))

// step_submissions existing check (maybeSingle)
const mockExistingMaybeSingle = vi.fn()
const mockExistingIn = vi.fn(() => ({ maybeSingle: mockExistingMaybeSingle }))
const mockExistingEq2 = vi.fn(() => ({ in: mockExistingIn }))
const mockExistingEq1 = vi.fn(() => ({ eq: mockExistingEq2 }))
const mockExistingSelect = vi.fn(() => ({ eq: mockExistingEq1 }))

// step_submissions insert
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockSubmissionsInsert = vi.fn(() => ({ select: mockInsertSelect }))

// parcours_steps update (status → pending_validation)
const mockStepUpdateEq = vi.fn(() => ({}))
const mockStepUpdate = vi.fn(() => ({ eq: mockStepUpdateEq }))

// notifications insert
const mockNotifInsert = vi.fn(() => ({}))

// Storage upload
const mockStorageUpload = vi.fn()
const mockStorageFrom = vi.fn(() => ({ upload: mockStorageUpload }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'parcours_steps') {
    return {
      select: mockStepSelect,
      update: mockStepUpdate,
    }
  }
  if (table === 'step_submissions') {
    return {
      select: mockExistingSelect,
      insert: mockSubmissionsInsert,
    }
  }
  if (table === 'notifications') return { insert: mockNotifInsert }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}))

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ID = '00000000-0000-0000-0000-000000000010'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000001'
const SUBMISSION_ID = '00000000-0000-0000-0000-000000000099'
const USER_ID = '00000000-0000-0000-0000-000000000003'

const mockClient = { id: CLIENT_ID, operator_id: OPERATOR_ID, name: 'Client Test' }
const mockStep = {
  id: STEP_ID,
  step_number: 1,
  title: 'Étape 1',
  parcours_id: '00000000-0000-0000-0000-000000000001',
  status: 'current',
  validation_required: true,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('submitStep Server Action — auth & validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockClientSingle.mockResolvedValue({ data: mockClient, error: null })
    mockStepSingle.mockResolvedValue({ data: mockStep, error: null })
    mockExistingMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsertSingle.mockResolvedValue({ data: { id: SUBMISSION_ID }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { submitStep } = await import('./submit-step')
    const result: ActionResponse<SubmitStepResult> = await submitStep({
      stepId: STEP_ID,
      content: 'X'.repeat(50),
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR when content is too short', async () => {
    const { submitStep } = await import('./submit-step')
    const result = await submitStep({ stepId: STEP_ID, content: 'court' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for invalid stepId', async () => {
    const { submitStep } = await import('./submit-step')
    const result = await submitStep({ stepId: 'not-a-uuid', content: 'X'.repeat(50) })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when client does not exist', async () => {
    mockClientSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { submitStep } = await import('./submit-step')
    const result = await submitStep({ stepId: STEP_ID, content: 'X'.repeat(50) })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns NOT_FOUND when step does not exist', async () => {
    mockStepSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { submitStep } = await import('./submit-step')
    const result = await submitStep({ stepId: STEP_ID, content: 'X'.repeat(50) })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns DUPLICATE_SUBMISSION when a pending submission already exists', async () => {
    mockExistingMaybeSingle.mockResolvedValue({
      data: { id: 'existing-id', status: 'pending' },
      error: null,
    })

    const { submitStep } = await import('./submit-step')
    const result = await submitStep({ stepId: STEP_ID, content: 'X'.repeat(50) })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DUPLICATE_SUBMISSION')
  })

  it('returns DATABASE_ERROR when submission insert fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { submitStep } = await import('./submit-step')
    const result = await submitStep({ stepId: STEP_ID, content: 'X'.repeat(50) })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('creates submission and returns submissionId on success', async () => {
    const { submitStep } = await import('./submit-step')
    const result = await submitStep({ stepId: STEP_ID, content: 'X'.repeat(50) })

    expect(result.error).toBeNull()
    expect(result.data?.submissionId).toBe(SUBMISSION_ID)
  })
})
