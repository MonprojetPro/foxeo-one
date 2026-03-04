import { describe, it, expect, vi, beforeEach } from 'vitest'

const AUTH_UUID = '550e8400-e29b-41d4-a716-446655440099'
const CLIENT_UUID = '550e8400-e29b-41d4-a716-446655440001'

const mockGetUser = vi.fn()
const mockValidationData = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'validation_requests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve(mockValidationData())),
            })),
          })),
        }
      }
      return {}
    }),
  })),
}))

describe('getClientPendingValidationsCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_UUID } }, error: null })
  })

  it('should return count 0 when no pending validations', async () => {
    mockValidationData.mockReturnValue({ data: [], error: null })

    const { getClientPendingValidationsCount } = await import('./get-client-pending-validations')
    const result = await getClientPendingValidationsCount(CLIENT_UUID)

    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(0)
  })

  it('should return correct count when pending validations exist', async () => {
    mockValidationData.mockReturnValue({
      data: [{ id: 'vr-1' }, { id: 'vr-2' }],
      error: null,
    })

    const { getClientPendingValidationsCount } = await import('./get-client-pending-validations')
    const result = await getClientPendingValidationsCount(CLIENT_UUID)

    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(2)
  })

  it('should return UNAUTHORIZED when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { getClientPendingValidationsCount } = await import('./get-client-pending-validations')
    const result = await getClientPendingValidationsCount(CLIENT_UUID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return DATABASE_ERROR when query fails', async () => {
    mockValidationData.mockReturnValue({
      data: null,
      error: { message: 'DB error', code: '500' },
    })

    const { getClientPendingValidationsCount } = await import('./get-client-pending-validations')
    const result = await getClientPendingValidationsCount(CLIENT_UUID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
