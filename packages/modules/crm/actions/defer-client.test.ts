import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deferClient } from './defer-client'

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

describe('deferClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should defer client successfully', async () => {
    mockEq2.mockResolvedValueOnce({ error: null })

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const futureDateISO = futureDate.toISOString()

    const result = await deferClient({
      clientId: validClientUuid,
      deferredUntil: futureDateISO,
    })

    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ deferred_until: futureDateISO })
    expect(mockFrom).toHaveBeenCalledWith('operators')
  })

  it('should clear defer successfully', async () => {
    mockEq2.mockResolvedValueOnce({ error: null })

    const result = await deferClient({
      clientId: validClientUuid,
      deferredUntil: null,
    })

    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ deferred_until: null })
  })

  it('should reject past dates', async () => {
    const pastDate = new Date('2020-01-01T00:00:00Z').toISOString()

    const result = await deferClient({
      clientId: validClientUuid,
      deferredUntil: pastDate,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('futur')
  })

  it('should return NOT_FOUND if operator lookup fails', async () => {
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)

    const result = await deferClient({
      clientId: validClientUuid,
      deferredUntil: futureDate.toISOString(),
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
