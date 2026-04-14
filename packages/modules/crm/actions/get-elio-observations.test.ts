import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ElioObservation } from './get-elio-observations'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

const mockOrderBy = vi.fn()
const mockNotFilter = vi.fn(() => ({ order: mockOrderBy }))
const mockEqDashboard = vi.fn(() => ({ not: mockNotFilter }))
const mockEqClient = vi.fn(() => ({ eq: mockEqDashboard }))
const mockSelectMessages = vi.fn(() => ({ eq: mockEqClient }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'elio_messages') return { select: mockSelectMessages }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '00000000-0000-0000-0000-000000000003'

const mockMessages = [
  {
    id: 'msg-1',
    metadata: { profile_observation: 'Client préfère les listes à puces' },
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'msg-2',
    metadata: { profile_observation: 'Client répond mieux le matin' },
    created_at: '2026-03-02T09:00:00Z',
  },
  {
    id: 'msg-3',
    metadata: { feedback: { rating: 'useful', createdAt: '2026-03-01' } }, // no observation
    created_at: '2026-03-01T11:00:00Z',
  },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getElioObservations Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockOrderBy.mockResolvedValue({ data: mockMessages, error: null })
  })

  it('returns INVALID_INPUT for invalid clientId', async () => {
    const { getElioObservations } = await import('./get-elio-observations')
    const result: ActionResponse<ElioObservation[]> = await getElioObservations('not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { getElioObservations } = await import('./get-elio-observations')
    const result = await getElioObservations(CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns observations with profile_observation only', async () => {
    const { getElioObservations } = await import('./get-elio-observations')
    const result = await getElioObservations(CLIENT_ID)

    expect(result.error).toBeNull()
    // Only messages with profile_observation are included
    expect(result.data).toHaveLength(2)
    expect(result.data![0].observation).toBe('Client préfère les listes à puces')
    expect(result.data![1].observation).toBe('Client répond mieux le matin')
  })

  it('returns empty array when no observations exist', async () => {
    mockOrderBy.mockResolvedValue({ data: [], error: null })

    const { getElioObservations } = await import('./get-elio-observations')
    const result = await getElioObservations(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('returns DATABASE_ERROR when fetch fails', async () => {
    mockOrderBy.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { getElioObservations } = await import('./get-elio-observations')
    const result = await getElioObservations(CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('includes messageId and createdAt in each observation', async () => {
    const { getElioObservations } = await import('./get-elio-observations')
    const result = await getElioObservations(CLIENT_ID)

    expect(result.data![0].messageId).toBe('msg-1')
    expect(result.data![0].createdAt).toBe('2026-03-01T10:00:00Z')
  })
})
