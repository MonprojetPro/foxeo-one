import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { SubmitStepResult } from '../types/parcours.types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// clients
const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

// parcours_steps get
const mockStepSingle = vi.fn()
const mockStepEq = vi.fn(() => ({ single: mockStepSingle }))
const mockStepSelect = vi.fn(() => ({ eq: mockStepEq }))

// parcours_steps update
const mockStepUpdateEq = vi.fn(() => ({}))
const mockStepUpdate = vi.fn(() => ({ eq: mockStepUpdateEq }))

// step_submissions check existing
const mockExistingMaybeSingle = vi.fn()
const mockExistingIn = vi.fn(() => ({ maybeSingle: mockExistingMaybeSingle }))
const mockExistingEq2 = vi.fn(() => ({ in: mockExistingIn }))
const mockExistingEq1 = vi.fn(() => ({ eq: mockExistingEq2 }))
const mockExistingSelect = vi.fn(() => ({ eq: mockExistingEq1 }))

// step_submissions insert
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

// validation_requests + notifications insert (fire-and-forget)
const mockSimpleInsert = vi.fn(() => ({}))

const mockFrom = vi.fn((table: string) => {
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'parcours_steps') return { select: mockStepSelect, update: mockStepUpdate }
  if (table === 'step_submissions') return { select: mockExistingSelect, insert: mockInsert }
  if (table === 'validation_requests') return { insert: mockSimpleInsert }
  if (table === 'notifications') return { insert: mockSimpleInsert }
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
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000001'
const SUBMISSION_ID = '00000000-0000-0000-0000-000000000099'
const USER_ID = '00000000-0000-0000-0000-000000000003'
const DOCUMENT = '## Mon Document\n\nContenu du document généré par Élio.'

const mockClient = { id: CLIENT_ID, operator_id: OPERATOR_ID, name: 'Client Test' }
const mockStep = {
  id: STEP_ID,
  step_number: 2,
  title: 'Valider mon concept',
  parcours_id: '00000000-0000-0000-0000-000000000001',
  status: 'current',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('submitGeneratedDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockClientSingle.mockResolvedValue({ data: mockClient, error: null })
    mockStepSingle.mockResolvedValue({ data: mockStep, error: null })
    mockExistingMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsertSingle.mockResolvedValue({ data: { id: SUBMISSION_ID }, error: null })
  })

  it('returns VALIDATION_ERROR when document is empty', async () => {
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    const result = await submitGeneratedDocument({ stepId: STEP_ID, document: '   ' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    const result: ActionResponse<SubmitStepResult> = await submitGeneratedDocument({
      stepId: STEP_ID,
      document: DOCUMENT,
    })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when client does not exist', async () => {
    mockClientSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    const result = await submitGeneratedDocument({ stepId: STEP_ID, document: DOCUMENT })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns NOT_FOUND when step does not exist', async () => {
    mockStepSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    const result = await submitGeneratedDocument({ stepId: STEP_ID, document: DOCUMENT })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns INVALID_STATUS when step is not current', async () => {
    mockStepSingle.mockResolvedValue({ data: { ...mockStep, status: 'locked' }, error: null })
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    const result = await submitGeneratedDocument({ stepId: STEP_ID, document: DOCUMENT })
    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('returns DUPLICATE_SUBMISSION when pending submission exists', async () => {
    mockExistingMaybeSingle.mockResolvedValue({ data: { id: 'existing-id' }, error: null })
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    const result = await submitGeneratedDocument({ stepId: STEP_ID, document: DOCUMENT })
    expect(result.error?.code).toBe('DUPLICATE_SUBMISSION')
  })

  it('returns DATABASE_ERROR when submission insert fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    const result = await submitGeneratedDocument({ stepId: STEP_ID, document: DOCUMENT })
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('returns submissionId on success', async () => {
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    const result = await submitGeneratedDocument({ stepId: STEP_ID, document: DOCUMENT })
    expect(result.error).toBeNull()
    expect(result.data?.submissionId).toBe(SUBMISSION_ID)
  })

  it('updates step status to pending_review on success', async () => {
    const { submitGeneratedDocument } = await import('./submit-generated-document')
    await submitGeneratedDocument({ stepId: STEP_ID, document: DOCUMENT })
    expect(mockStepUpdate).toHaveBeenCalledWith({ status: 'pending_review' })
    expect(mockStepUpdateEq).toHaveBeenCalledWith('id', STEP_ID)
  })
})
