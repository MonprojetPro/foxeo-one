import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'

const REQ_ID = '550e8400-e29b-41d4-a716-446655440001'
const OPERATOR_ID = '550e8400-e29b-41d4-a716-446655440003'
const AUTH_USER_ID = '550e8400-e29b-41d4-a716-446655440004'

const MOCK_USER = { id: AUTH_USER_ID }
const MOCK_OPERATOR = { id: OPERATOR_ID }
const MOCK_REQUEST = {
  id: REQ_ID,
  client_id: '550e8400-e29b-41d4-a716-446655440002',
  operator_id: OPERATOR_ID,
  parcours_id: null,
  step_id: null,
  type: 'brief_lab',
  title: 'Brief Vision',
  content: 'Contenu',
  document_ids: [],
  status: 'pending',
  reviewer_comment: 'Reporté : Pas le moment',
  submitted_at: '2026-02-20T10:00:00Z',
  reviewed_at: null,
  created_at: '2026-02-20T10:00:00Z',
  updated_at: '2026-02-25T10:00:00Z',
}

function buildSupabaseMock({
  userError = null as unknown,
  operatorError = null as unknown,
  requestError = null as unknown,
  notifError = null as unknown,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userError ? null : MOCK_USER },
        error: userError,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: operatorError ? null : MOCK_OPERATOR,
                error: operatorError,
              }),
            })),
          })),
        }
      }
      if (table === 'validation_requests') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: requestError ? null : MOCK_REQUEST,
                  error: requestError,
                }),
              })),
            })),
          })),
        }
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'notif-1' }, error: notifError }),
            })),
          })),
        }
      }
      return {}
    }),
  }
}

describe('postponeRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return success without reason or reminder', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { postponeRequest } = await import('./postpone-request')
    const result = await postponeRequest(REQ_ID, 'Brief Vision', 'Alice')

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('pending')
  })

  it('should include reason in reviewer_comment', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { postponeRequest } = await import('./postpone-request')
    const result = await postponeRequest(REQ_ID, 'Brief Vision', 'Alice', 'Pas le moment')

    expect(result.error).toBeNull()
    expect(result.data?.reviewerComment).toBe('Reporté : Pas le moment')
  })

  it('should create reminder notification when reminderDate is provided', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { postponeRequest } = await import('./postpone-request')
    const reminderDate = '2026-03-01T00:00:00.000Z'
    await postponeRequest(REQ_ID, 'Brief Vision', 'Alice', 'Plus tard', reminderDate)

    const fromCall = vi.mocked(mockSupabase.from)
    const notifCall = fromCall.mock.calls.find(([t]) => t === 'notifications')
    expect(notifCall).toBeDefined()
  })

  it('should NOT create notification when no reminderDate', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { postponeRequest } = await import('./postpone-request')
    await postponeRequest(REQ_ID, 'Brief Vision', 'Alice', 'Plus tard')

    const fromCall = vi.mocked(mockSupabase.from)
    const notifCall = fromCall.mock.calls.find(([t]) => t === 'notifications')
    expect(notifCall).toBeUndefined()
  })

  it('should return VALIDATION_ERROR for invalid requestId', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { postponeRequest } = await import('./postpone-request')
    const result = await postponeRequest('not-a-uuid', 'Brief Vision', 'Alice')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR when reason exceeds 500 chars', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { postponeRequest } = await import('./postpone-request')
    const result = await postponeRequest(REQ_ID, 'Brief Vision', 'Alice', 'A'.repeat(501))

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ userError: new Error('Not authenticated') }) as never
    )
    const { postponeRequest } = await import('./postpone-request')
    const result = await postponeRequest(REQ_ID, 'Brief Vision', 'Alice')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator is not found', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ operatorError: new Error('Not found') }) as never
    )
    const { postponeRequest } = await import('./postpone-request')
    const result = await postponeRequest(REQ_ID, 'Brief Vision', 'Alice')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DB_ERROR when request update fails', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ requestError: { message: 'DB error' } }) as never
    )
    const { postponeRequest } = await import('./postpone-request')
    const result = await postponeRequest(REQ_ID, 'Brief Vision', 'Alice')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should succeed even if reminder notification fails (non-blocking)', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ notifError: { message: 'Notification error' } }) as never
    )
    const { postponeRequest } = await import('./postpone-request')
    const reminderDate = '2026-03-01T00:00:00.000Z'
    const result = await postponeRequest(REQ_ID, 'Brief Vision', 'Alice', 'Raison', reminderDate)

    expect(result.error).toBeNull()
  })

  it('should use "Reporté" without reason when reason is not provided', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { postponeRequest } = await import('./postpone-request')
    // Override mock to return a request with just "Reporté"
    const mockReq = { ...MOCK_REQUEST, reviewer_comment: 'Reporté' }
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER }, error: null }) },
      from: vi.fn((table: string) => {
        if (table === 'operators') return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: MOCK_OPERATOR, error: null }) })) })) }
        if (table === 'validation_requests') return { update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: mockReq, error: null }) })) })) })) }
        return {}
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const result = await postponeRequest(REQ_ID, 'Brief Vision', 'Alice')
    expect(result.error).toBeNull()
    expect(result.data?.reviewerComment).toBe('Reporté')
  })
})
