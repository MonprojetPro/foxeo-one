import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startImpersonation } from './start-impersonation'

// Mock Supabase
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn()
const mockInvoke = vi.fn()

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    eq: mockEq,
  })),
  functions: {
    invoke: mockInvoke,
  },
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))

describe('startImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default chain setup
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockMaybeSingle, eq: mockEq })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockInvoke.mockResolvedValue({ data: null, error: null })
  })

  it('should reject unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const result = await startImpersonation({ clientId: '00000000-0000-0000-0000-000000000001' })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should reject non-operator users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    // First .from('operators') call
    let fromCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            })),
          })),
        }
      }
      return { select: mockSelect, insert: mockInsert, eq: mockEq }
    })

    const result = await startImpersonation({ clientId: '00000000-0000-0000-0000-000000000001' })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('should reject invalid client ID', async () => {
    const result = await startImpersonation({ clientId: 'not-a-uuid' })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should succeed with valid operator and client', async () => {
    const operatorId = '00000000-0000-0000-0000-000000000010'
    const clientId = '00000000-0000-0000-0000-000000000001'
    const clientAuthUserId = '00000000-0000-0000-0000-000000000002'
    const sessionId = '00000000-0000-0000-0000-000000000099'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth-id' } },
      error: null,
    })

    let fromCallIndex = 0
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallIndex++
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: operatorId },
                error: null,
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
                data: {
                  id: clientId,
                  auth_user_id: clientAuthUserId,
                  name: 'Dupont',
                  first_name: 'Jean',
                  email: 'jean@test.com',
                  status: 'active',
                },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        // Check existing → none, then insert
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: sessionId },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'activity_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return { select: mockSelect, insert: mockInsert }
    })

    const result = await startImpersonation({ clientId })

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(result.data?.sessionId).toBe(sessionId)
    expect(result.data?.clientName).toBe('Jean Dupont')
    expect(result.data?.redirectUrl).toContain(sessionId)
  })

  it('should reject if active session exists', async () => {
    const operatorId = '00000000-0000-0000-0000-000000000010'
    const clientId = '00000000-0000-0000-0000-000000000001'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth-id' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: operatorId },
                error: null,
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
                data: {
                  id: clientId,
                  auth_user_id: 'auth-id',
                  name: 'Test',
                  first_name: null,
                  email: 'test@test.com',
                  status: 'active',
                },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'existing-session' },
                  error: null,
                }),
              })),
            })),
          })),
        }
      }
      return { select: mockSelect, insert: mockInsert }
    })

    const result = await startImpersonation({ clientId })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('should reject client without auth user', async () => {
    const operatorId = '00000000-0000-0000-0000-000000000010'
    const clientId = '00000000-0000-0000-0000-000000000001'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth-id' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: operatorId },
                error: null,
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
                data: {
                  id: clientId,
                  auth_user_id: null,
                  name: 'Test',
                  first_name: null,
                  email: 'test@test.com',
                  status: 'active',
                },
                error: null,
              }),
            })),
          })),
        }
      }
      return { select: mockSelect, insert: mockInsert }
    })

    const result = await startImpersonation({ clientId })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})
