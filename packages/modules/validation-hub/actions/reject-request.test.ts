import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'

const REQ_ID = '550e8400-e29b-41d4-a716-446655440001'
const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440002'
const OPERATOR_ID = '550e8400-e29b-41d4-a716-446655440003'
const AUTH_USER_ID = '550e8400-e29b-41d4-a716-446655440004'

const MOCK_USER = { id: AUTH_USER_ID }
const MOCK_OPERATOR = { id: OPERATOR_ID }
const MOCK_REQUEST = {
  id: REQ_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  parcours_id: null,
  step_id: null,
  type: 'brief_lab',
  title: 'Brief Vision',
  content: 'Contenu',
  document_ids: [],
  status: 'rejected',
  reviewer_comment: 'Veuillez préciser votre cible.',
  submitted_at: '2026-02-20T10:00:00Z',
  reviewed_at: '2026-02-25T10:00:00Z',
  created_at: '2026-02-20T10:00:00Z',
  updated_at: '2026-02-25T10:00:00Z',
}

function buildSupabaseMock({
  userError = null as unknown,
  operatorError = null as unknown,
  rpcError = null as unknown,
  rpcData = MOCK_REQUEST as unknown,
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
      return {}
    }),
    rpc: vi.fn().mockResolvedValue({ data: rpcData, error: rpcError }),
  }
}

describe('rejectRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return success with camelCase data when RPC succeeds', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )

    const { rejectRequest } = await import('./reject-request')
    const result = await rejectRequest(REQ_ID, 'Veuillez préciser votre cible.')

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(REQ_ID)
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.status).toBe('rejected')
  })

  it('should call RPC with correct parameters', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { rejectRequest } = await import('./reject-request')
    await rejectRequest(REQ_ID, 'Veuillez préciser votre cible.')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('reject_validation_request', {
      p_request_id: REQ_ID,
      p_comment: 'Veuillez préciser votre cible.',
      p_operator_id: OPERATOR_ID,
    })
  })

  it('should return VALIDATION_ERROR for invalid requestId', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )

    const { rejectRequest } = await import('./reject-request')
    const result = await rejectRequest('not-a-uuid', 'Commentaire valide ici')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR when comment is too short (< 10 chars)', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )

    const { rejectRequest } = await import('./reject-request')
    const result = await rejectRequest(REQ_ID, 'Court')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR when comment exceeds 500 chars', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )

    const { rejectRequest } = await import('./reject-request')
    const result = await rejectRequest(REQ_ID, 'A'.repeat(501))

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should accept comment with exactly 10 characters', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )

    const { rejectRequest } = await import('./reject-request')
    const result = await rejectRequest(REQ_ID, '1234567890')

    expect(result.error).toBeNull()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ userError: new Error('Not authenticated') }) as never
    )

    const { rejectRequest } = await import('./reject-request')
    const result = await rejectRequest(REQ_ID, 'Veuillez préciser votre cible.')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator is not found', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ operatorError: new Error('Not found') }) as never
    )

    const { rejectRequest } = await import('./reject-request')
    const result = await rejectRequest(REQ_ID, 'Veuillez préciser votre cible.')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DB_ERROR when RPC fails', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ rpcError: { message: 'Transaction failed' } }) as never
    )

    const { rejectRequest } = await import('./reject-request')
    const result = await rejectRequest(REQ_ID, 'Veuillez préciser votre cible.')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
