import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { Client } from '../types/crm.types'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'
const testClientId = '550e8400-e29b-41d4-a716-446655440099'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440098'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockSingle = vi.fn()
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))
const mockMaybeSingle = vi.fn()
const mockSelectEq2 = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelectEq1 = vi.fn(() => ({ eq: mockSelectEq2 }))
const mockSelectChain = vi.fn(() => ({ eq: mockSelectEq1 }))

// Operator lookup mock chain
const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: mockOpSelect }
  }
  if (table === 'client_configs') {
    return { insert: vi.fn().mockResolvedValue({ error: null }) }
  }
  return {
    select: mockSelectChain,
    insert: mockInsert,
  }
})
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('createClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockOpSingle.mockResolvedValue({ data: { id: testOperatorId }, error: null })
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { createClient } = await import('./create-client')
    const result: ActionResponse<Client> = await createClient({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for invalid input', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    const { createClient } = await import('./create-client')
    const result = await createClient({
      name: 'J', // too short
      email: 'not-an-email',
      clientType: 'ponctuel',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return EMAIL_ALREADY_EXISTS when email is duplicate for operator', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockMaybeSingle.mockResolvedValue({
      data: { id: 'existing-id' },
      error: null,
    })

    const { createClient } = await import('./create-client')
    const result = await createClient({
      name: 'Jean Dupont',
      email: 'existing@acme.com',
      clientType: 'ponctuel',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('EMAIL_ALREADY_EXISTS')
  })

  it('should return DB_ERROR when email uniqueness check fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Query failed', code: 'PGRST301' },
    })

    const { createClient } = await import('./create-client')
    const result = await createClient({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should create client and client_configs on valid input', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    // Email uniqueness check - no existing
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })

    // Client insert
    mockSingle.mockResolvedValue({
      data: {
        id: testClientId,
        operator_id: testOperatorId,
        name: 'Jean Dupont',
        company: 'Jean Dupont',
        email: 'jean@acme.com',
        client_type: 'ponctuel',
        status: 'lab-actif',
        sector: null,
        phone: null,
        website: null,
        notes: null,
        created_at: '2026-02-13T10:00:00Z',
        updated_at: '2026-02-13T10:00:00Z',
      },
      error: null,
    })

    const { createClient } = await import('./create-client')
    const result = await createClient({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.id).toBe(testClientId)
    expect(result.data?.name).toBe('Jean Dupont')
    // Verify camelCase transformation
    expect(result.data).toHaveProperty('clientType')
    expect(result.data).toHaveProperty('createdAt')
    expect(result.data).not.toHaveProperty('client_type')
    expect(result.data).not.toHaveProperty('created_at')
  })

  it('should return DB_ERROR when insert fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed', code: 'PGRST301' },
    })

    const { createClient } = await import('./create-client')
    const result = await createClient({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { createClient } = await import('./create-client')
    const result = await createClient({
      name: 'Test',
      email: 'test@test.com',
      clientType: 'ponctuel',
    })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
