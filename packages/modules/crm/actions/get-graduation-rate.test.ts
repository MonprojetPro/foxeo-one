import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { GraduationRate } from '../types/crm.types'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock Supabase server client
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

// Helper to build the operators mock chain
const makeOpChain = () => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: { id: validOperatorUuid }, error: null }),
    })),
  })),
})

describe('getGraduationRate Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getGraduationRate } = await import('./get-graduation-rate')
    const result: ActionResponse<GraduationRate> = await getGraduationRate()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should calculate graduation rate from activity logs filtered by client_id', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      if (table === 'clients') {
        // Chain: select → eq(operator_id) → eq(client_type)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: 'c1' },
                  { id: 'c2' },
                  { id: 'c3' },
                  { id: 'c4' },
                  { id: 'c5' },
                ],
                error: null,
              }),
            })),
          })),
        }
      }
      // activity_logs — Chain: select → eq(event_type) → in(client_id)
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: '1', client_id: 'c1' },
                { id: '2', client_id: 'c2' },
              ],
              error: null,
            }),
          })),
        })),
      }
    })

    const { getGraduationRate } = await import('./get-graduation-rate')
    const result: ActionResponse<GraduationRate> = await getGraduationRate()

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    const rate = result.data!
    expect(rate.graduated).toBe(2)
    expect(rate.totalLabClients).toBe(5)
    expect(rate.percentage).toBeCloseTo(40) // 2/5 = 40%
  })

  it('should return 0% when no Lab clients exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      }
    })

    const { getGraduationRate } = await import('./get-graduation-rate')
    const result: ActionResponse<GraduationRate> = await getGraduationRate()

    expect(result.error).toBeNull()
    const rate = result.data!
    expect(rate.graduated).toBe(0)
    expect(rate.totalLabClients).toBe(0)
    expect(rate.percentage).toBe(0)
  })

  it('should return DATABASE_ERROR on Supabase failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection refused' },
            }),
          })),
        })),
      }
    })

    const { getGraduationRate } = await import('./get-graduation-rate')
    const result: ActionResponse<GraduationRate> = await getGraduationRate()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should filter activity_logs by client_id not operator_id', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    const mockIn = vi.fn().mockResolvedValue({
      data: [{ id: '1', client_id: 'c1' }],
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'c1' }],
                error: null,
              }),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: mockIn,
          })),
        })),
      }
    })

    const { getGraduationRate } = await import('./get-graduation-rate')
    await getGraduationRate()

    // Verify activity_logs is filtered by client_id (not operator_id)
    expect(mockIn).toHaveBeenCalledWith('client_id', ['c1'])
  })
})
