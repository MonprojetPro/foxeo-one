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
  requestError = null as unknown,
  bmadProjectPath = '/projects/client-alice' as string | null,
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
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { auth_user_id: 'auth-user-client-1', bmad_project_path: bmadProjectPath },
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

  it('should return DB_ERROR when request update fails', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ requestError: { message: 'DB error' } }) as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev(REQ_ID, CLIENT_ID, 'Brief Vision')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should succeed even if notification creation fails (non-blocking)', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ notifError: { message: 'Notification error' } }) as never
    )
    const { startDev } = await import('./start-dev')
    const result = await startDev(REQ_ID, CLIENT_ID, 'Brief Vision')

    expect(result.error).toBeNull()
    expect(result.data?.request.status).toBe('approved')
  })

  it('should include title in notification', async () => {
    const mockSupabase = buildSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

    const { startDev } = await import('./start-dev')
    await startDev(REQ_ID, CLIENT_ID, 'Mon Brief Important')

    const fromCall = vi.mocked(mockSupabase.from)
    const notifCall = fromCall.mock.calls.find(([t]) => t === 'notifications')
    expect(notifCall).toBeDefined()
  })
})
