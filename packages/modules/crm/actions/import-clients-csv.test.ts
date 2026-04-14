import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CsvImportRow } from '../types/crm.types'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockInsert = vi.fn()
const mockSelectChain = vi.fn()
const mockIn = vi.fn()
const mockEq = vi.fn()
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
      single: vi.fn().mockResolvedValue({ data: { id: testOperatorId }, error: null }),
    })),
  })),
})

const validRow: CsvImportRow = {
  lineNumber: 2,
  name: 'Jean Dupont',
  email: 'jean@test.com',
  company: 'Acme',
  phone: '0612345678',
  sector: 'Tech',
  clientType: 'complet',
}

describe('importClientsCsv Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { importClientsCsv } = await import('./import-clients-csv')
    const result = await importClientsCsv({ rows: [validRow] })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for empty rows array', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      return {}
    })

    const { importClientsCsv } = await import('./import-clients-csv')
    const result = await importClientsCsv({ rows: [] })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should skip rows with existing emails and import the rest', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    // Email check — "existing@test.com" already exists
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: [{ email: 'existing@test.com' }],
                error: null,
              }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'new-client-id', client_type: 'complet' }],
              error: null,
            }),
          })),
        }
      }
      if (table === 'client_configs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {}
    })

    const rows: CsvImportRow[] = [
      { ...validRow, lineNumber: 2, email: 'existing@test.com' },
      { ...validRow, lineNumber: 3, email: 'new@test.com', name: 'Marie' },
    ]

    const { importClientsCsv } = await import('./import-clients-csv')
    const result = await importClientsCsv({ rows })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.imported).toBe(1)
    expect(result.data?.ignored).toBe(1)
    expect(result.data?.errors).toHaveLength(1)
  })

  it('should return success with all ignored when all emails exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
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
              in: vi.fn().mockResolvedValue({
                data: [{ email: 'a@test.com' }, { email: 'b@test.com' }],
                error: null,
              }),
            })),
          })),
        }
      }
      return {}
    })

    const rows: CsvImportRow[] = [
      { ...validRow, lineNumber: 2, email: 'a@test.com' },
      { ...validRow, lineNumber: 3, email: 'b@test.com' },
    ]

    const { importClientsCsv } = await import('./import-clients-csv')
    const result = await importClientsCsv({ rows })

    expect(result.error).toBeNull()
    expect(result.data?.imported).toBe(0)
    expect(result.data?.ignored).toBe(2)
  })

  it('should return DB_ERROR when email check fails', async () => {
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
            in: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB connection failed' },
            }),
          })),
        })),
      }
    })

    const { importClientsCsv } = await import('./import-clients-csv')
    const result = await importClientsCsv({ rows: [validRow] })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should return DB_ERROR when batch insert fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
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
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          })),
        }
      }
      return {}
    })

    const { importClientsCsv } = await import('./import-clients-csv')
    const result = await importClientsCsv({ rows: [validRow] })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { importClientsCsv } = await import('./import-clients-csv')
    const result = await importClientsCsv({ rows: [validRow] })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
