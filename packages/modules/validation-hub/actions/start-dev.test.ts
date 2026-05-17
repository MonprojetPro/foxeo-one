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
  reviewer_comment: 'Pris en charge — développement direct',
  submitted_at: '2026-02-20T10:00:00Z',
  reviewed_at: '2026-02-25T10:00:00Z',
  created_at: '2026-02-20T10:00:00Z',
  updated_at: '2026-02-25T10:00:00Z',
}

function buildSupabaseMock({
  userError = null as unknown,
  operatorError = null as unknown,
  rpcError = null as unknown,
  bmadProjectPath = '/projects/client-alice' as string | null,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userError ? null : MOCK_USER },
        error: userError,
      }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: rpcError ? null : MOCK_REQUEST,
      error: rpcError,
    }),
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
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { bmad_project_path: bmadProjectPath },
                error: null,
              }),
            })),
          })),
        }
      }
      return {}
    }),
  }
}

describe('startDev', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return success with cursorUrl when bmad_project_path exists', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ bmadProjectPath: '/projects/client-alice' }) as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev(REQ_ID, CLIENT_ID, 'Brief Vision')

    expect(result.error).toBeNull()
    expect(result.data?.request.status).toBe('approved')
    expect(result.data?.cursorUrl).toBe('cursor:///projects/client-alice')
  })

  it('should return null cursorUrl when bmad_project_path is null', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ bmadProjectPath: null }) as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev(REQ_ID, CLIENT_ID, 'Brief Vision')

    expect(result.error).toBeNull()
    expect(result.data?.cursorUrl).toBeNull()
  })

  it('should return VALIDATION_ERROR for invalid requestId', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev('not-a-uuid', CLIENT_ID, 'Brief Vision')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR when requestTitle is empty', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev(REQ_ID, CLIENT_ID, '')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ userError: new Error('Not authenticated') }) as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev(REQ_ID, CLIENT_ID, 'Brief Vision')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator is not found', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ operatorError: new Error('Not found') }) as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev(REQ_ID, CLIENT_ID, 'Brief Vision')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DB_ERROR when RPC fails', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ rpcError: { message: 'DB error' } }) as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev(REQ_ID, CLIENT_ID, 'Brief Vision')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should call approve_validation_request RPC with custom notification wording', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { startDev } = await import('./start-dev')
    await startDev(REQ_ID, CLIENT_ID, 'Mon Brief Important')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_validation_request', {
      p_request_id: REQ_ID,
      p_comment: 'Pris en charge — développement direct',
      p_operator_id: OPERATOR_ID,
      p_notification_title: expect.stringContaining('Mon Brief Important'),
      p_notification_body: expect.stringContaining('commence le développement'),
    })
  })
})
