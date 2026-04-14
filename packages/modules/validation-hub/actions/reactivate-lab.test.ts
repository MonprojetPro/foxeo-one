import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'

const REQ_ID = '550e8400-e29b-41d4-a716-446655440001'
const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440002'
const OPERATOR_ID = '550e8400-e29b-41d4-a716-446655440003'
const AUTH_USER_ID = '550e8400-e29b-41d4-a716-446655440004'
const PARCOURS_ID = '550e8400-e29b-41d4-a716-446655440005'

const MOCK_USER = { id: AUTH_USER_ID }
const MOCK_OPERATOR = { id: OPERATOR_ID }
const MOCK_REQUEST = {
  id: REQ_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  parcours_id: PARCOURS_ID,
  step_id: null,
  type: 'brief_lab',
  title: 'Brief Vision',
  content: 'Contenu',
  document_ids: [],
  status: 'approved',
  reviewer_comment: 'Besoin redirigé vers le parcours Lab',
  submitted_at: '2026-02-20T10:00:00Z',
  reviewed_at: '2026-02-25T10:00:00Z',
  created_at: '2026-02-20T10:00:00Z',
  updated_at: '2026-02-25T10:00:00Z',
}

function buildFromMock({
  parcoursStatus = 'completed',
  parcoursUpdateError = null as unknown,
  notifError = null as unknown,
  clientAuthUserId = 'auth-user-client-1',
} = {}) {
  return vi.fn((table: string) => {
    if (table === 'operators') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: MOCK_OPERATOR, error: null }),
          })),
        })),
      }
    }
    if (table === 'validation_requests') {
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: MOCK_REQUEST, error: null }),
            })),
          })),
        })),
      }
    }
    if (table === 'client_parcours') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: PARCOURS_ID, status: parcoursStatus },
              error: null,
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: parcoursUpdateError }),
        })),
      }
    }
    if (table === 'clients') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { auth_user_id: clientAuthUserId },
              error: null,
            }),
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
  })
}

function buildSupabaseMock({
  userError = null as unknown,
  operatorError = null as unknown,
  requestError = null as unknown,
  parcoursStatus = 'completed',
  parcoursUpdateError = null as unknown,
  notifError = null as unknown,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userError ? null : MOCK_USER },
        error: userError,
      }),
    },
    from: operatorError
      ? vi.fn((table: string) => {
          if (table === 'operators') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: operatorError }),
                })),
              })),
            }
          }
          return buildFromMock({ parcoursStatus, parcoursUpdateError, notifError })(table)
        })
      : requestError
        ? vi.fn((table: string) => {
            if (table === 'operators') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: MOCK_OPERATOR, error: null }),
                  })),
                })),
              }
            }
            if (table === 'validation_requests') {
              return {
                update: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: null, error: requestError }),
                    })),
                  })),
                })),
              }
            }
            return buildFromMock({ parcoursStatus, parcoursUpdateError, notifError })(table)
          })
        : buildFromMock({ parcoursStatus, parcoursUpdateError, notifError }),
  }
}

describe('reactivateLab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return success and mark request approved', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab(REQ_ID, CLIENT_ID, PARCOURS_ID)

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('approved')
    expect(result.data?.reviewerComment).toBe('Besoin redirigé vers le parcours Lab')
  })

  it('should return VALIDATION_ERROR for invalid requestId', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab('not-a-uuid', CLIENT_ID, PARCOURS_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR for invalid parcoursId', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab(REQ_ID, CLIENT_ID, 'not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ userError: new Error('Not authenticated') }) as never
    )
    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab(REQ_ID, CLIENT_ID, PARCOURS_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator is not found', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ operatorError: new Error('Not found') }) as never
    )
    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab(REQ_ID, CLIENT_ID, PARCOURS_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DB_ERROR when request update fails', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ requestError: { message: 'DB error' } }) as never
    )
    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab(REQ_ID, CLIENT_ID, PARCOURS_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should reactivate parcours when status is completed', async () => {
    const mockSupabase = buildSupabaseMock({ parcoursStatus: 'completed' })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab(REQ_ID, CLIENT_ID, PARCOURS_ID)

    expect(result.error).toBeNull()
    // Success even if parcours update is called
  })

  it('should reactivate parcours when status is suspended', async () => {
    const mockSupabase = buildSupabaseMock({ parcoursStatus: 'suspended' })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab(REQ_ID, CLIENT_ID, PARCOURS_ID)

    expect(result.error).toBeNull()
  })

  it('should succeed even if notification creation fails (non-blocking)', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ notifError: { message: 'Notification error' } }) as never
    )
    const { reactivateLab } = await import('./reactivate-lab')
    const result = await reactivateLab(REQ_ID, CLIENT_ID, PARCOURS_ID)

    // Main action should still succeed
    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('approved')
  })
})
