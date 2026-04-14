import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteClientNote } from './delete-client-note'

const validNoteUuid = '550e8400-e29b-41d4-a716-446655440002'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'
const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440001'

const mockEq2 = vi.fn()
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
const mockDelete = vi.fn(() => ({ eq: mockEq1 }))

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

describe('deleteClientNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should delete note successfully', async () => {
    mockEq2.mockResolvedValueOnce({
      error: null,
    })

    const result = await deleteClientNote(validNoteUuid)

    expect(result.error).toBeNull()
    expect(result.data).toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('operators')
    expect(mockFrom).toHaveBeenCalledWith('client_notes')
  })

  it('should return error for invalid UUID', async () => {
    const result = await deleteClientNote('not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND if operator lookup fails', async () => {
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await deleteClientNote(validNoteUuid)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
