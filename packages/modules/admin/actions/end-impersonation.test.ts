import { describe, it, expect, vi, beforeEach } from 'vitest'
import { endImpersonation } from './end-impersonation'

const mockRpc = vi.fn()

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  // La clôture passe par fn_close_impersonation_session (décompte réel des actions).
  rpc: mockRpc,
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))

describe('endImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject invalid session ID', async () => {
    const result = await endImpersonation({ sessionId: 'not-a-uuid' })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should reject unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const result = await endImpersonation({
      sessionId: '00000000-0000-0000-0000-000000000001',
    })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should reject non-operator users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            })),
          })),
        }
      }
      return {}
    })

    const result = await endImpersonation({
      sessionId: '00000000-0000-0000-0000-000000000001',
    })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('should return NOT_FOUND for missing session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'op-1' }, error: null }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            })),
          })),
        }
      }
      return {}
    })

    const result = await endImpersonation({
      sessionId: '00000000-0000-0000-0000-000000000001',
    })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should succeed for already ended session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'op-1' }, error: null }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '00000000-0000-0000-0000-000000000001',
                  operator_id: 'op-1',
                  client_id: 'cl-1',
                  status: 'ended',
                  started_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        }
      }
      return {}
    })

    const result = await endImpersonation({
      sessionId: '00000000-0000-0000-0000-000000000001',
    })

    expect(result.error).toBeNull()
    expect(result.data?.ended).toBe(true)
  })

  it('should end active session and log activity', async () => {
    const sessionId = '00000000-0000-0000-0000-000000000001'
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth' } },
      error: null,
    })

    // La clôture et le décompte sont faits par la RPC (hors RLS).
    mockRpc.mockResolvedValue({
      data: [{ session_id: sessionId, actions_count: 5, closed: true }],
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'op-1' }, error: null }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: sessionId,
                  operator_id: 'op-1',
                  client_id: 'cl-1',
                  status: 'active',
                  started_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return {}
    })

    const result = await endImpersonation({ sessionId })

    expect(result.error).toBeNull()
    expect(result.data?.ended).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_close_impersonation_session', {
      p_session_id: sessionId,
      p_status: 'ended',
    })
    // Le décompte réel doit être repris dans le log de fin — l'ancien comptage
    // (activity_logs filtré sur l'opérateur) renvoyait toujours 1.
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'impersonation_ended',
        metadata: expect.objectContaining({ actions_count: 5 }),
      })
    )
  })
})
