import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getReminders } from './get-reminders'

// Mock Supabase
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockLt = vi.fn()
const mockOrder = vi.fn()
const mockNoteSelect = vi.fn()

// Operator lookup chain
const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: mockOpSelect }
  }
  return { select: mockNoteSelect }
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

describe('getReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockNoteSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ gte: mockGte, then: vi.fn() })
    mockGte.mockReturnValue({ lt: mockLt })
  })

  it('should fetch all reminders for operator', async () => {
    const mockRemindersDB = [
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: validOperatorUuid,
        client_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Reminder 1',
        description: null,
        due_date: '2026-02-20T10:00:00Z',
        completed: false,
        created_at: '2026-02-15T10:00:00Z',
        updated_at: '2026-02-15T10:00:00Z',
      },
    ]

    mockOrder.mockResolvedValue({
      data: mockRemindersDB,
      error: null,
    })

    const result = await getReminders()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].title).toBe('Reminder 1')

    expect(mockFrom).toHaveBeenCalledWith('operators')
    expect(mockFrom).toHaveBeenCalledWith('reminders')
    expect(mockEq).toHaveBeenCalledWith('operator_id', validOperatorUuid)
  })

  it('should filter reminders by upcoming status', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const mockRemindersDB = [
      {
        id: '1',
        operator_id: validOperatorUuid,
        client_id: null,
        title: 'Future',
        description: null,
        due_date: futureDate,
        completed: false,
        created_at: '2026-02-15T10:00:00Z',
        updated_at: '2026-02-15T10:00:00Z',
      },
      {
        id: '2',
        operator_id: validOperatorUuid,
        client_id: null,
        title: 'Completed',
        description: null,
        due_date: futureDate,
        completed: true,
        created_at: '2026-02-15T10:00:00Z',
        updated_at: '2026-02-15T10:00:00Z',
      },
    ]

    mockOrder.mockResolvedValue({
      data: mockRemindersDB,
      error: null,
    })

    const result = await getReminders({ filter: 'upcoming' })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].title).toBe('Future')
  })

  it('should filter reminders by overdue status', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString()
    const mockRemindersDB = [
      {
        id: '1',
        operator_id: validOperatorUuid,
        client_id: null,
        title: 'Overdue',
        description: null,
        due_date: pastDate,
        completed: false,
        created_at: '2026-02-15T10:00:00Z',
        updated_at: '2026-02-15T10:00:00Z',
      },
    ]

    mockOrder.mockResolvedValue({
      data: mockRemindersDB,
      error: null,
    })

    const result = await getReminders({ filter: 'overdue' })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].title).toBe('Overdue')
  })

  it('should return empty array when no reminders found', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    })

    const result = await getReminders()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should return error if fetch fails', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: '500' },
    })

    const result = await getReminders()

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('FETCH_FAILED')
  })

  it('should return NOT_FOUND if operator lookup fails', async () => {
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await getReminders()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
