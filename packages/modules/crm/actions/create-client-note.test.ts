import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClientNote } from './create-client-note'

// Mock Supabase
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))

// Operator lookup chain
const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: mockOpSelect }
  }
  return { insert: mockInsert }
})

const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'
const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440001'
const validClientUuid = '550e8400-e29b-41d4-a716-446655440000'
const validNoteUuid = '550e8400-e29b-41d4-a716-446655440002'

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

describe('createClientNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: operator lookup succeeds
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  it('should create a note successfully', async () => {
    const mockNoteDB = {
      id: validNoteUuid,
      client_id: validClientUuid,
      operator_id: validOperatorUuid,
      content: 'Test note',
      created_at: '2026-02-15T10:00:00Z',
      updated_at: '2026-02-15T10:00:00Z',
    }

    mockSingle.mockResolvedValue({
      data: mockNoteDB,
      error: null,
    })

    const result = await createClientNote({
      clientId: validClientUuid,
      content: 'Test note',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      id: validNoteUuid,
      clientId: validClientUuid,
      operatorId: validOperatorUuid,
      content: 'Test note',
      createdAt: '2026-02-15T10:00:00Z',
      updatedAt: '2026-02-15T10:00:00Z',
    })

    expect(mockFrom).toHaveBeenCalledWith('operators')
    expect(mockFrom).toHaveBeenCalledWith('client_notes')
    expect(mockInsert).toHaveBeenCalledWith({
      client_id: validClientUuid,
      operator_id: validOperatorUuid,
      content: 'Test note',
    })
  })

  it('should return error if insert fails', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: '500' },
    })

    const result = await createClientNote({
      clientId: validClientUuid,
      content: 'Test note',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      message: 'Impossible de créer la note',
      code: 'CREATE_FAILED',
      details: expect.anything(),
    })
  })

  it('should return error if input validation fails', async () => {
    const result = await createClientNote({
      clientId: validClientUuid,
      content: '', // Empty content
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      message: 'Le contenu de la note est requis',
      code: 'VALIDATION_ERROR',
      details: expect.anything(),
    })
  })

  it('should return error if not authenticated', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockReturnValueOnce({
      from: mockFrom,
      auth: {
        getUser: vi.fn(() => Promise.resolve({
          data: { user: null },
          error: { message: 'Not authenticated' },
        })),
      },
    } as any)

    const result = await createClientNote({
      clientId: validClientUuid,
      content: 'Test note',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      message: 'Non authentifié',
      code: 'UNAUTHORIZED',
    })
  })

  it('should return NOT_FOUND if operator lookup fails', async () => {
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await createClientNote({
      clientId: validClientUuid,
      content: 'Test note',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
