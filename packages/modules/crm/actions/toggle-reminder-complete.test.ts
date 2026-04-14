import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toggleReminderComplete } from './toggle-reminder-complete'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440001'

// Create mock for RPC-based toggle
const createMockSupabase = (rpcData: unknown, rpcError?: unknown) => {
  return {
    rpc: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: rpcData, error: rpcError }),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: validOperatorUuid } },
        error: null,
      })),
    },
  }
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

describe('toggleReminderComplete', () => {
  const validReminderUuid = '550e8400-e29b-41d4-a716-446655440002'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should toggle reminder to completed', async () => {
    const mockReminderDB = {
      id: validReminderUuid,
      operator_id: validOperatorUuid,
      client_id: null,
      title: 'Test',
      description: null,
      due_date: '2026-02-20T10:00:00Z',
      completed: true,
      created_at: '2026-02-15T10:00:00Z',
      updated_at: '2026-02-15T10:00:00Z',
    }

    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      createMockSupabase(mockReminderDB) as never
    )

    const result = await toggleReminderComplete({
      reminderId: validReminderUuid,
    })

    expect(result.error).toBeNull()
    expect(result.data?.completed).toBe(true)
  })

  it('should toggle reminder to incomplete', async () => {
    const mockReminderDB = {
      id: validReminderUuid,
      operator_id: validOperatorUuid,
      client_id: null,
      title: 'Test',
      description: null,
      due_date: '2026-02-20T10:00:00Z',
      completed: false,
      created_at: '2026-02-15T10:00:00Z',
      updated_at: '2026-02-15T10:00:00Z',
    }

    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      createMockSupabase(mockReminderDB) as never
    )

    const result = await toggleReminderComplete({
      reminderId: validReminderUuid,
    })

    expect(result.error).toBeNull()
    expect(result.data?.completed).toBe(false)
  })

  it('should return error if reminder not found', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      createMockSupabase(null, { message: 'Not found', code: 'PGRST116' }) as never
    )

    const result = await toggleReminderComplete({
      reminderId: validReminderUuid,
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return validation error for invalid UUID', async () => {
    const result = await toggleReminderComplete({
      reminderId: 'invalid-uuid',
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})
