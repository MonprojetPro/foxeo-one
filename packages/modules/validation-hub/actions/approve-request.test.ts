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
  status: 'approved',
  reviewer_comment: 'Excellent !',
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

describe('approveRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return success with camelCase data when RPC succeeds', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )

    const { approveRequest } = await import('./approve-request')
    const result = await approveRequest(REQ_ID, 'Excellent !')

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(REQ_ID)
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.status).toBe('approved')
  })

  it('should call RPC with correct parameters', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { approveRequest } = await import('./approve-request')
    await approveRequest(REQ_ID, 'Un commentaire')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_validation_request', {
      p_request_id: REQ_ID,
      p_comment: 'Un commentaire',
      p_operator_id: OPERATOR_ID,
    })
  })

  it('should call RPC with null comment when no comment provided', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { approveRequest } = await import('./approve-request')
    await approveRequest(REQ_ID)

    expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_validation_request', {
      p_request_id: REQ_ID,
      p_comment: null,
      p_operator_id: OPERATOR_ID,
    })
  })

  it('should return VALIDATION_ERROR for invalid requestId', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )

    const { approveRequest } = await import('./approve-request')
    const result = await approveRequest('not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR when comment exceeds 500 chars', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )

    const { approveRequest } = await import('./approve-request')
    const result = await approveRequest(REQ_ID, 'A'.repeat(501))

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ userError: new Error('Not authenticated') }) as never
    )

    const { approveRequest } = await import('./approve-request')
    const result = await approveRequest(REQ_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator is not found', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ operatorError: new Error('Not found') }) as never
    )

    const { approveRequest } = await import('./approve-request')
    const result = await approveRequest(REQ_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DB_ERROR when RPC fails', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ rpcError: { message: 'RPC error' } }) as never
    )

    const { approveRequest } = await import('./approve-request')
    const result = await approveRequest(REQ_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
