import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toggleClientModule } from './toggle-client-module'

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = 'user-123'
const OPERATOR_ID = 'op-123'

const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockIn = vi.fn()

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
  })),
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))

function setupAuth() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  })
}

function setupFromChain(table: string, response: unknown) {
  // Track calls to from() and return appropriate chains
  const chain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation(() => ({
        single: vi.fn().mockResolvedValue(response),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(response),
          in: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(response),
          }),
        }),
        in: vi.fn().mockResolvedValue(response),
      })),
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(response),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }
  return chain
}

describe('toggleClientModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAuth()
  })

  it('should reject unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const result = await toggleClientModule(CLIENT_ID, 'crm', true)
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should reject non-operator users', async () => {
    const callCount = { fromCalls: 0 }
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }
      }
      return { select: mockSelect, insert: mockInsert, update: mockUpdate }
    })

    const result = await toggleClientModule(CLIENT_ID, 'crm', true)
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should activate a module with no dependencies', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { active_modules: ['core-dashboard'] },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'module_catalog') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { module_key: 'crm', is_default: false, requires_modules: [] },
                  error: null,
                }),
              }),
            }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return { select: mockSelect }
    })

    const result = await toggleClientModule(CLIENT_ID, 'crm', true)
    expect(result.error).toBeNull()
    expect(result.data?.enabled).toBe('crm')
    expect(result.data?.cascaded).toEqual([])
  })

  it('should block deactivation of a default module', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { active_modules: ['core-dashboard', 'chat'] },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'module_catalog') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { module_key: 'core-dashboard', is_default: true, requires_modules: [] },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      return { select: mockSelect }
    })

    const result = await toggleClientModule(CLIENT_ID, 'core-dashboard', false)
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('MODULE_IS_DEFAULT')
  })

  it('should block deactivation when another module depends on it', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { active_modules: ['core-dashboard', 'crm', 'facturation'] },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'module_catalog') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { module_key: 'crm', is_default: false, requires_modules: [] },
                  error: null,
                }),
              }),
            }),
            in: vi.fn().mockResolvedValue({
              data: [
                { module_key: 'core-dashboard', requires_modules: [] },
                { module_key: 'crm', requires_modules: [] },
                { module_key: 'facturation', requires_modules: ['crm'] },
              ],
              error: null,
            }),
          }),
        }
      }
      return { select: mockSelect }
    })

    const result = await toggleClientModule(CLIENT_ID, 'crm', false)
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('MODULE_REQUIRED_BY_OTHER')
    expect(result.error?.message).toContain('facturation')
  })
})
