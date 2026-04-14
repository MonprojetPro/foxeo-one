import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { PortfolioStats } from '../types/crm.types'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock Supabase server client
const mockEq = vi.fn()
const mockSelect = vi.fn(() => ({ eq: mockEq }))

// Operator lookup mock chain
const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOpSelect }
  return { select: mockSelect }
})
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('getPortfolioStats Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getPortfolioStats } = await import('./get-portfolio-stats')
    const result: ActionResponse<PortfolioStats> = await getPortfolioStats()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return correct aggregated stats for mixed portfolio', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockEq.mockResolvedValue({
      data: [
        { id: '1', client_type: 'complet', status: 'active', client_configs: { dashboard_type: 'lab' } },
        { id: '2', client_type: 'complet', status: 'active', client_configs: { dashboard_type: 'one' } },
        { id: '3', client_type: 'direct_one', status: 'active', client_configs: { dashboard_type: 'one' } },
        { id: '4', client_type: 'ponctuel', status: 'archived', client_configs: null },
        { id: '5', client_type: 'complet', status: 'suspended', client_configs: null },
      ],
      error: null,
    })

    const { getPortfolioStats } = await import('./get-portfolio-stats')
    const result: ActionResponse<PortfolioStats> = await getPortfolioStats()

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    const stats = result.data!
    expect(stats.totalClients).toBe(5)

    // Status counts
    expect(stats.byStatus.active).toBe(3)
    expect(stats.byStatus.archived).toBe(1)
    expect(stats.byStatus.suspended).toBe(1)

    // Type counts (historical label, commercial origin)
    expect(stats.byType.complet).toBe(3)
    expect(stats.byType.directOne).toBe(1)
    expect(stats.byType.ponctuel).toBe(1)

    // Dashboard-type counts (source of truth — ADR-01 Rev 2)
    expect(stats.byDashboardType.lab).toBe(1)
    expect(stats.byDashboardType.one).toBe(2)

    // Lab/One active (based on client_configs.dashboard_type)
    expect(stats.labActive).toBe(1)
    expect(stats.oneActive).toBe(2)

    // MRR not available (billing module not present)
    expect(stats.mrr.available).toBe(false)
  })

  it('should return zero stats when no clients exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockEq.mockResolvedValue({
      data: [],
      error: null,
    })

    const { getPortfolioStats } = await import('./get-portfolio-stats')
    const result: ActionResponse<PortfolioStats> = await getPortfolioStats()

    expect(result.error).toBeNull()
    const stats = result.data!
    expect(stats.totalClients).toBe(0)
    expect(stats.byStatus.active).toBe(0)
    expect(stats.byType.complet).toBe(0)
    expect(stats.byDashboardType.lab).toBe(0)
    expect(stats.byDashboardType.one).toBe(0)
    expect(stats.labActive).toBe(0)
    expect(stats.oneActive).toBe(0)
  })

  it('should return DATABASE_ERROR when Supabase query fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockEq.mockResolvedValue({
      data: null,
      error: { message: 'Connection refused', code: 'PGRST301' },
    })

    const { getPortfolioStats } = await import('./get-portfolio-stats')
    const result: ActionResponse<PortfolioStats> = await getPortfolioStats()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should return camelCase fields only (no snake_case leak)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockEq.mockResolvedValue({
      data: [
        { id: '1', client_type: 'complet', status: 'active', client_configs: { dashboard_type: 'lab' } },
      ],
      error: null,
    })

    const { getPortfolioStats } = await import('./get-portfolio-stats')
    const result: ActionResponse<PortfolioStats> = await getPortfolioStats()

    const stats = result.data!
    expect(stats).toHaveProperty('totalClients')
    expect(stats).toHaveProperty('byStatus')
    expect(stats).toHaveProperty('byType')
    expect(stats).toHaveProperty('byDashboardType')
    expect(stats).toHaveProperty('labActive')
    expect(stats).toHaveProperty('oneActive')
    expect(stats).toHaveProperty('mrr')
    // No snake_case leakage
    expect(stats).not.toHaveProperty('total_clients')
    expect(stats).not.toHaveProperty('lab_active')
  })

  it('should query clients with operator_id filter', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockEq.mockResolvedValue({ data: [], error: null })

    const { getPortfolioStats } = await import('./get-portfolio-stats')
    await getPortfolioStats()

    expect(mockFrom).toHaveBeenCalledWith('clients')
    expect(mockEq).toHaveBeenCalledWith('operator_id', validOperatorUuid)
  })
})
