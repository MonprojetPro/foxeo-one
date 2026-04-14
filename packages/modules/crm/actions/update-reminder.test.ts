import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateReminder } from './update-reminder'

// Mock Supabase
const mockUpdate = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockEqOperator = vi.fn()
const mockEqId = vi.fn()

// Operator lookup chain
const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: mockOpSelect }
  }
  return { update: mockUpdate }
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

describe('updateReminder', () => {
  const validReminderUuid = '550e8400-e29b-41d4-a716-446655440002'

  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    // Chain: .update().eq('id', ...).eq('operator_id', ...).select().single()
    mockUpdate.mockReturnValue({ eq: mockEqId })
    mockEqId.mockReturnValue({ eq: mockEqOperator })
    mockEqOperator.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  it('should update reminder title successfully', async () => {
    const mockReminderDB = {
      id: validReminderUuid,
      operator_id: validOperatorUuid,
      client_id: null,
      title: 'Updated Title',
      description: null,
      due_date: '2026-02-20T10:00:00Z',
      completed: false,
      created_at: '2026-02-15T10:00:00Z',
      updated_at: '2026-02-15T10:00:00Z',
    }

    mockSingle.mockResolvedValue({
      data: mockReminderDB,
      error: null,
    })

    const result = await updateReminder({
      reminderId: validReminderUuid,
      title: 'Updated Title',
    })

    expect(result.error).toBeNull()
    expect(result.data?.title).toBe('Updated Title')
    expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated Title' })
    expect(mockEqId).toHaveBeenCalledWith('id', validReminderUuid)
    expect(mockEqOperator).toHaveBeenCalledWith('operator_id', validOperatorUuid)
    expect(mockFrom).toHaveBeenCalledWith('operators')
  })

  it('should update reminder description and dueDate', async () => {
    const mockReminderDB = {
      id: validReminderUuid,
      operator_id: validOperatorUuid,
      client_id: null,
      title: 'Test',
      description: 'New description',
      due_date: '2026-03-01T10:00:00Z',
      completed: false,
      created_at: '2026-02-15T10:00:00Z',
      updated_at: '2026-02-15T10:00:00Z',
    }

    mockSingle.mockResolvedValue({
      data: mockReminderDB,
      error: null,
    })

    const result = await updateReminder({
      reminderId: validReminderUuid,
      description: 'New description',
      dueDate: '2026-03-01T10:00:00Z',
    })

    expect(result.error).toBeNull()
    expect(result.data?.description).toBe('New description')
    expect(result.data?.dueDate).toBe('2026-03-01T10:00:00Z')
    expect(mockUpdate).toHaveBeenCalledWith({
      description: 'New description',
      due_date: '2026-03-01T10:00:00Z',
    })
  })

  it('should update description to null', async () => {
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

    mockSingle.mockResolvedValue({
      data: mockReminderDB,
      error: null,
    })

    const result = await updateReminder({
      reminderId: validReminderUuid,
      description: null,
    })

    expect(result.error).toBeNull()
    expect(result.data?.description).toBeNull()
  })

  it('should return error if no fields to update', async () => {
    const result = await updateReminder({
      reminderId: validReminderUuid,
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('Aucune donnée à modifier')
  })

  it('should return error if update fails', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: '500' },
    })

    const result = await updateReminder({
      reminderId: validReminderUuid,
      title: 'New Title',
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('UPDATE_FAILED')
  })

  it('should return validation error for title longer than 200 chars', async () => {
    const result = await updateReminder({
      reminderId: validReminderUuid,
      title: 'a'.repeat(201),
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND if operator lookup fails', async () => {
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await updateReminder({
      reminderId: validReminderUuid,
      title: 'Test',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
