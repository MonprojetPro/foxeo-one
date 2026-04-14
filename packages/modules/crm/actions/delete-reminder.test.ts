import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteReminder } from './delete-reminder'

// Mock Supabase
const mockDelete = vi.fn()
const mockEqId = vi.fn()
const mockEqOperator = vi.fn()

// Operator lookup chain
const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: mockOpSelect }
  }
  return { delete: mockDelete }
})

const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'
const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440001'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: validAuthUuid } },
        error: null,
      })),
    },
  })),
}))

describe('deleteReminder', () => {
  const validReminderUuid = '550e8400-e29b-41d4-a716-446655440002'

  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    // Chain: .delete().eq('id', ...).eq('operator_id', ...)
    mockDelete.mockReturnValue({ eq: mockEqId })
    mockEqId.mockReturnValue({ eq: mockEqOperator })
  })

  it('should delete reminder successfully', async () => {
    mockEqOperator.mockResolvedValue({
      data: null,
      error: null,
    })

    const result = await deleteReminder({
      reminderId: validReminderUuid,
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('operators')
    expect(mockFrom).toHaveBeenCalledWith('reminders')
    expect(mockEqId).toHaveBeenCalledWith('id', validReminderUuid)
    expect(mockEqOperator).toHaveBeenCalledWith('operator_id', validOperatorUuid)
  })

  it('should return error if delete fails', async () => {
    mockEqOperator.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: '500' },
    })

    const result = await deleteReminder({
      reminderId: validReminderUuid,
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('DELETE_FAILED')
  })

  it('should return validation error for invalid UUID', async () => {
    const result = await deleteReminder({
      reminderId: 'not-a-uuid',
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('ID de rappel invalide')
  })

  it('should return validation error for empty reminderId', async () => {
    const result = await deleteReminder({
      reminderId: '',
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND if operator lookup fails', async () => {
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await deleteReminder({
      reminderId: validReminderUuid,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
