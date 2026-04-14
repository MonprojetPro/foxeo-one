import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { Client } from '../types/crm.types'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock Supabase server client with chainable eq()
const mockSingle = vi.fn()
const mockEq = vi.fn(function mockEqFn() {
  // Support chaining: .eq().eq().single()
  const chain = {
    eq: mockEq,
    single: mockSingle,
  }
  return chain
})
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

describe('getClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should return INVALID_INPUT for non-UUID clientId', async () => {
    const { getClient } = await import('./get-client')
    const result = await getClient('not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return INVALID_INPUT for empty clientId', async () => {
    const { getClient } = await import('./get-client')
    const result = await getClient('')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getClient } = await import('./get-client')
    const result: ActionResponse<Client> = await getClient('550e8400-e29b-41d4-a716-446655440001')

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when client does not exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'The result contains 0 rows' },
    })

    const { getClient } = await import('./get-client')
    const result: ActionResponse<Client> = await getClient('550e8400-e29b-41d4-a716-446655440001')

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return client in correct camelCase format with all fields', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        operator_id: validOperatorUuid,
        name: 'Jean Dupont',
        company: 'Acme Corp',
        email: 'jean@acme.com',
        client_type: 'complet',
        status: 'active',
        sector: 'tech',
        phone: '+33612345678',
        website: 'https://acme.com',
        notes: 'Client important',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-20T14:30:00Z',
        client_configs: {
          active_modules: ['core-dashboard', 'chat'],
          dashboard_type: 'one',
          theme_variant: null,
          parcours_config: {},
        },
      },
      error: null,
    })

    const { getClient } = await import('./get-client')
    const result: ActionResponse<Client> = await getClient('550e8400-e29b-41d4-a716-446655440001')

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    const client = result.data!
    expect(client).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440001')
    expect(client).toHaveProperty('operatorId', validOperatorUuid)
    expect(client).toHaveProperty('name', 'Jean Dupont')
    expect(client).toHaveProperty('company', 'Acme Corp')
    expect(client).toHaveProperty('email', 'jean@acme.com')
    expect(client).toHaveProperty('clientType', 'complet')
    expect(client).toHaveProperty('status', 'active')
    expect(client).toHaveProperty('sector', 'tech')
    expect(client).toHaveProperty('phone', '+33612345678')
    expect(client).toHaveProperty('website', 'https://acme.com')
    expect(client).toHaveProperty('notes', 'Client important')
    expect(client).toHaveProperty('createdAt', '2024-01-15T10:00:00Z')
    expect(client).toHaveProperty('updatedAt', '2024-01-20T14:30:00Z')

    // Verify config is transformed from client_configs join
    expect(client.config).toBeDefined()
    expect(client.config?.activeModules).toEqual(['core-dashboard', 'chat'])
    expect(client.config?.dashboardType).toBe('one')

    // Verify snake_case fields are NOT present
    expect(client).not.toHaveProperty('operator_id')
    expect(client).not.toHaveProperty('client_type')
    expect(client).not.toHaveProperty('created_at')
    expect(client).not.toHaveProperty('updated_at')
  })

  it('should return DATABASE_ERROR when Supabase query fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Connection refused', code: 'PGRST301' },
    })

    const { getClient } = await import('./get-client')
    const result: ActionResponse<Client> = await getClient('550e8400-e29b-41d4-a716-446655440001')

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should return ActionResponse format with data or error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        operator_id: validOperatorUuid,
        name: 'Test',
        company: 'Test Inc',
        email: 'test@test.com',
        client_type: 'ponctuel',
        status: 'active',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        client_configs: null,
      },
      error: null,
    })

    const { getClient } = await import('./get-client')
    const result = await getClient('550e8400-e29b-41d4-a716-446655440001')

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')

    if (result.data !== null) {
      expect(result.error).toBeNull()
      expect(result.data).toHaveProperty('id')
      expect(result.data).toHaveProperty('name')
    } else {
      expect(result.error).not.toBeNull()
      expect(result.error).toHaveProperty('message')
      expect(result.error).toHaveProperty('code')
    }
  })

  it('should use operator_id filter to enforce ownership', async () => {
    const clientId = '550e8400-e29b-41d4-a716-446655440001'

    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({ data: null, error: null })

    const { getClient } = await import('./get-client')
    await getClient(clientId)

    expect(mockFrom).toHaveBeenCalledWith('clients')
    expect(mockEq).toHaveBeenCalledWith('operator_id', validOperatorUuid)
  })

  it('should handle optional fields correctly', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        operator_id: validOperatorUuid,
        name: 'Jean Dupont',
        company: 'Acme Corp',
        email: 'jean@acme.com',
        client_type: 'ponctuel',
        status: 'active',
        sector: null,
        phone: null,
        website: null,
        notes: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        client_configs: null,
      },
      error: null,
    })

    const { getClient } = await import('./get-client')
    const result: ActionResponse<Client> = await getClient('550e8400-e29b-41d4-a716-446655440001')

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    const client = result.data!
    expect(client.sector).toBeUndefined()
    expect(client.phone).toBeUndefined()
    expect(client.website).toBeUndefined()
    expect(client.notes).toBeUndefined()
    expect(client.config).toBeUndefined()
  })
})
