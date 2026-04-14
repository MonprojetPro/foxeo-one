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
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockEqUpdatedAt = vi.fn(() => ({ select: mockSelect }))
const mockUpdateEqOperator = vi.fn(() => ({ eq: mockEqUpdatedAt, select: mockSelect }))
const mockUpdateEqId = vi.fn(() => ({ eq: mockUpdateEqOperator }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEqId }))
const mockMaybeSingle = vi.fn()
const mockNeq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelectEq2 = vi.fn(() => ({ neq: mockNeq }))
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
  return {
    select: mockSelectChain,
    update: mockUpdate,
  }
})
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('updateClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockOpSingle.mockResolvedValue({ data: { id: testOperatorId }, error: null })
  })

  it('should return VALIDATION_ERROR for invalid clientId (not UUID)', async () => {
    const { updateClient } = await import('./update-client')
    const result = await updateClient('not-a-uuid', {
      name: 'Nouveau Nom',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('Identifiant client invalide')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { updateClient } = await import('./update-client')
    const result: ActionResponse<Client> = await updateClient(testClientId, {
      name: 'Nouveau Nom',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for invalid input', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    const { updateClient } = await import('./update-client')
    const result = await updateClient(testClientId, {
      email: 'not-an-email',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return EMAIL_ALREADY_EXISTS when email is used by another client', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockMaybeSingle.mockResolvedValue({
      data: { id: 'other-client-id' },
      error: null,
    })

    const { updateClient } = await import('./update-client')
    const result = await updateClient(testClientId, {
      email: 'existing@acme.com',
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

    const { updateClient } = await import('./update-client')
    const result = await updateClient(testClientId, {
      email: 'test@acme.com',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should update client fields successfully', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: {
        id: testClientId,
        operator_id: testOperatorId,
        name: 'Nouveau Nom',
        company: 'Acme Corp',
        email: 'jean@acme.com',
        client_type: 'complet',
        status: 'lab-actif',
        sector: 'tech',
        phone: null,
        website: null,
        notes: null,
        created_at: '2026-02-13T10:00:00Z',
        updated_at: '2026-02-13T12:00:00Z',
      },
      error: null,
    })

    const { updateClient } = await import('./update-client')
    const result = await updateClient(testClientId, {
      name: 'Nouveau Nom',
    })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.name).toBe('Nouveau Nom')
    // Verify camelCase
    expect(result.data).toHaveProperty('clientType')
    expect(result.data).not.toHaveProperty('client_type')
  })

  it('should include operator_id filter in update query', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: {
        id: testClientId,
        operator_id: testOperatorId,
        name: 'Nouveau Nom',
        company: 'Acme Corp',
        email: 'jean@acme.com',
        client_type: 'complet',
        status: 'lab-actif',
        sector: null,
        phone: null,
        website: null,
        notes: null,
        created_at: '2026-02-13T10:00:00Z',
        updated_at: '2026-02-13T12:00:00Z',
      },
      error: null,
    })

    const { updateClient } = await import('./update-client')
    await updateClient(testClientId, { name: 'Nouveau Nom' })

    // Verify both eq calls: id + operator_id
    expect(mockUpdateEqId).toHaveBeenCalledWith('id', testClientId)
    expect(mockUpdateEqOperator).toHaveBeenCalledWith('operator_id', testOperatorId)
  })

  it('should return DB_ERROR when update fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Update failed', code: 'PGRST301' },
    })

    const { updateClient } = await import('./update-client')
    const result = await updateClient(testClientId, {
      name: 'Nouveau Nom',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { updateClient } = await import('./update-client')
    const result = await updateClient(testClientId, { name: 'Test' })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })

  it('should return CONFLICT when updatedAt is provided and row was modified (PGRST116)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    })

    const { updateClient } = await import('./update-client')
    const result = await updateClient(
      testClientId,
      { name: 'Nouveau Nom' },
      { updatedAt: '2026-02-13T10:00:00Z' }
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFLICT')
    expect(result.error?.message).toContain('modifi')
  })

  it('should add updated_at eq filter when updatedAt option is provided', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: {
        id: testClientId,
        operator_id: testOperatorId,
        name: 'Nouveau Nom',
        company: 'Acme Corp',
        email: 'jean@acme.com',
        client_type: 'complet',
        status: 'lab-actif',
        sector: null,
        phone: null,
        website: null,
        notes: null,
        created_at: '2026-02-13T10:00:00Z',
        updated_at: '2026-02-13T12:00:00Z',
      },
      error: null,
    })

    const { updateClient } = await import('./update-client')
    await updateClient(
      testClientId,
      { name: 'Nouveau Nom' },
      { updatedAt: '2026-02-13T10:00:00Z' }
    )

    expect(mockEqUpdatedAt).toHaveBeenCalledWith('updated_at', '2026-02-13T10:00:00Z')
  })

  it('should skip updated_at check when force option is true', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: {
        id: testClientId,
        operator_id: testOperatorId,
        name: 'Forcé',
        company: 'Acme Corp',
        email: 'jean@acme.com',
        client_type: 'complet',
        status: 'lab-actif',
        sector: null,
        phone: null,
        website: null,
        notes: null,
        created_at: '2026-02-13T10:00:00Z',
        updated_at: '2026-02-13T14:00:00Z',
      },
      error: null,
    })

    const { updateClient } = await import('./update-client')
    const result = await updateClient(
      testClientId,
      { name: 'Forcé' },
      { updatedAt: '2026-02-13T10:00:00Z', force: true }
    )

    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Forcé')
    // updated_at eq should NOT have been called
    expect(mockEqUpdatedAt).not.toHaveBeenCalledWith('updated_at', expect.anything())
  })

  it('should skip email uniqueness check when email is not in update', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockSingle.mockResolvedValue({
      data: {
        id: testClientId,
        operator_id: testOperatorId,
        name: 'Nouveau Nom',
        company: 'Acme Corp',
        email: 'jean@acme.com',
        client_type: 'complet',
        status: 'lab-actif',
        sector: null,
        phone: null,
        website: null,
        notes: null,
        created_at: '2026-02-13T10:00:00Z',
        updated_at: '2026-02-13T12:00:00Z',
      },
      error: null,
    })

    const { updateClient } = await import('./update-client')
    await updateClient(testClientId, { name: 'Nouveau Nom' })

    // Email uniqueness check should not have been called
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })
})
