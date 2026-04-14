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
  status: 'pending',
  reviewer_comment: 'Visio à programmer',
  submitted_at: '2026-02-20T10:00:00Z',
  reviewed_at: '2026-02-25T10:00:00Z',
  created_at: '2026-02-20T10:00:00Z',
  updated_at: '2026-02-25T10:00:00Z',
}

const MOCK_CLIENT = {
  auth_user_id: 'auth-user-client-1',
  name: 'Alice Martin',
  email: 'alice@example.com',
}

function buildSupabaseMock({
  userError = null as unknown,
  operatorError = null as unknown,
  requestError = null as unknown,
  clientError = null as unknown,
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
                data: clientError ? null : MOCK_CLIENT,
                error: clientError,
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

describe('scheduleVisio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return success with request and calComUrl', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { scheduleVisio } = await import('./schedule-visio')
    const result = await scheduleVisio(REQ_ID, CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data?.request.status).toBe('pending')
    expect(result.data?.request.reviewerComment).toBe('Visio à programmer')
    expect(result.data?.calComUrl).toContain('cal.com/mikl/consult')
    expect(result.data?.calComUrl).toContain('Alice%20Martin')
    expect(result.data?.clientName).toBe('Alice Martin')
    expect(result.data?.clientEmail).toBe('alice@example.com')
  })

  it('should return VALIDATION_ERROR for invalid requestId', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { scheduleVisio } = await import('./schedule-visio')
    const result = await scheduleVisio('not-a-uuid', CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ userError: new Error('Not authenticated') }) as never
    )
    const { scheduleVisio } = await import('./schedule-visio')
    const result = await scheduleVisio(REQ_ID, CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator is not found', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ operatorError: new Error('Not found') }) as never
    )
    const { scheduleVisio } = await import('./schedule-visio')
    const result = await scheduleVisio(REQ_ID, CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DB_ERROR when request update fails', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ requestError: { message: 'DB error' } }) as never
    )
    const { scheduleVisio } = await import('./schedule-visio')
    const result = await scheduleVisio(REQ_ID, CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should return NOT_FOUND when client is not found', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ clientError: new Error('Not found') }) as never
    )
    const { scheduleVisio } = await import('./schedule-visio')
    const result = await scheduleVisio(REQ_ID, CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should succeed even if notification creation fails (non-blocking)', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock({ notifError: { message: 'Notification error' } }) as never
    )
    const { scheduleVisio } = await import('./schedule-visio')
    const result = await scheduleVisio(REQ_ID, CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data?.request.status).toBe('pending')
  })

  it('should URL-encode client name and email in calComUrl', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabaseMock() as never
    )
    const { scheduleVisio } = await import('./schedule-visio')
    const result = await scheduleVisio(REQ_ID, CLIENT_ID)

    expect(result.data?.calComUrl).toContain(encodeURIComponent('Alice Martin'))
    expect(result.data?.calComUrl).toContain(encodeURIComponent('alice@example.com'))
  })
})
