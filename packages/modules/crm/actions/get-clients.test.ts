import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ClientListItem } from '../types/crm.types'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock Supabase server client
const mockLimit = vi.fn()
const mockOrder2 = vi.fn(() => ({ limit: mockLimit }))
const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }))
const mockIn = vi.fn(() => ({ order: mockOrder1 }))
// mockNeq references itself to allow chaining .neq().neq() (Story 9.5c: exclude both archived and deleted)
const mockNeq: ReturnType<typeof vi.fn> = vi.fn(() => ({ neq: mockNeq, order: mockOrder1, in: mockIn }))
const mockEq = vi.fn(() => ({ neq: mockNeq, order: mockOrder1, in: mockIn }))
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

describe('getClients Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getClients } = await import('./get-clients')
    const result: ActionResponse<ClientListItem[]> = await getClients()

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return clients in correct camelCase format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          operator_id: validOperatorUuid,
          name: 'Jean Dupont',
          company: 'Acme Corp',
          email: 'jean@acme.com',
          sector: 'tech',
          client_type: 'complet',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          is_pinned: false,
          deferred_until: null,
        },
      ],
      error: null,
    })

    const { getClients } = await import('./get-clients')
    const result: ActionResponse<ClientListItem[]> = await getClients()

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data).toHaveLength(1)

    const client = result.data![0]
    expect(client).toHaveProperty('clientType', 'complet')
    expect(client).toHaveProperty('createdAt', '2024-01-15T10:00:00Z')
    expect(client).toHaveProperty('email', 'jean@acme.com')
    expect(client).toHaveProperty('sector', 'tech')
    expect(client).not.toHaveProperty('client_type')
    expect(client).not.toHaveProperty('created_at')
  })

  it('should return DATABASE_ERROR when Supabase query fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({
      data: null,
      error: { message: 'Connection refused', code: 'PGRST301' },
    })

    const { getClients } = await import('./get-clients')
    const result: ActionResponse<ClientListItem[]> = await getClients()

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should return empty array when no data', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({
      data: [],
      error: null,
    })

    const { getClients } = await import('./get-clients')
    const result: ActionResponse<ClientListItem[]> = await getClients()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should return ActionResponse format with data or error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({
      data: [],
      error: null,
    })

    const { getClients } = await import('./get-clients')
    const result = await getClients()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')

    if (result.data !== null) {
      expect(result.error).toBeNull()
      expect(Array.isArray(result.data)).toBe(true)
    } else {
      expect(result.error).not.toBeNull()
      expect(result.error).toHaveProperty('message')
      expect(result.error).toHaveProperty('code')
    }
  })

  it('should use operator_id from authenticated session', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getClients } = await import('./get-clients')
    await getClients()

    expect(mockFrom).toHaveBeenCalledWith('clients')
    expect(mockEq).toHaveBeenCalledWith('operator_id', validOperatorUuid)
  })

  it('should exclude deleted clients by default (prospects and archived are visible)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getClients } = await import('./get-clients')
    await getClients()

    expect(mockNeq).toHaveBeenCalledWith('status', 'deleted')
  })

  it('should include archived clients when archived filter is active', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getClients } = await import('./get-clients')
    await getClients({ status: ['archived'] })

    expect(mockNeq).not.toHaveBeenCalled()
    expect(mockIn).toHaveBeenCalledWith('status', ['archived'])
  })

  it('should apply clientType filter when provided', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getClients } = await import('./get-clients')
    await getClients({ clientType: ['complet', 'ponctuel'] })

    expect(mockIn).toHaveBeenCalledWith('client_type', ['complet', 'ponctuel'])
  })

  it('should apply status filter when provided', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getClients } = await import('./get-clients')
    await getClients({ status: ['active', 'suspended'] })

    expect(mockNeq).not.toHaveBeenCalled()
    expect(mockIn).toHaveBeenCalledWith('status', ['active', 'suspended'])
  })
})
