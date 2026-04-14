import { describe, it, expect, vi, beforeEach } from 'vitest'
import { togglePinClient } from './toggle-pin-client'

const validClientUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'
const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440001'

const mockEq2 = vi.fn()
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
const mockUpdate = vi.fn(() => ({ eq: mockEq1 }))

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

describe('togglePinClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should pin client successfully', async () => {
    mockEq2.mockResolvedValueOnce({ error: null })

    const result = await togglePinClient(validClientUuid, true)

    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ is_pinned: true })
    expect(mockFrom).toHaveBeenCalledWith('operators')
  })

  it('should unpin client successfully', async () => {
    mockEq2.mockResolvedValueOnce({ error: null })

    const result = await togglePinClient(validClientUuid, false)

    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ is_pinned: false })
  })

  it('should return NOT_FOUND if operator lookup fails', async () => {
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await togglePinClient(validClientUuid, true)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
