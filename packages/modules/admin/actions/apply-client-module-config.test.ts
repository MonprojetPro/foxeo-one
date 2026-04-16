import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyClientModuleConfig } from './apply-client-module-config'

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = 'user-123'
const OPERATOR_ID = 'op-123'

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))

const CATALOG_ENTRIES = [
  { module_key: 'core-dashboard', is_default: true, requires_modules: [], is_active: true },
  { module_key: 'chat', is_default: true, requires_modules: [], is_active: true },
  { module_key: 'documents', is_default: true, requires_modules: [], is_active: true },
  { module_key: 'elio', is_default: true, requires_modules: [], is_active: true },
  { module_key: 'crm', is_default: false, requires_modules: [], is_active: true },
  { module_key: 'facturation', is_default: false, requires_modules: ['crm'], is_active: true },
  { module_key: 'visio', is_default: false, requires_modules: [], is_active: true },
]

function setupAuth() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  })
}

describe('applyClientModuleConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAuth()
  })

  it('should reject unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const result = await applyClientModuleConfig(CLIENT_ID, ['crm'])
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should apply config and inject defaults + dependencies', async () => {
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
      if (table === 'module_catalog') {
        return {
          select: vi.fn().mockResolvedValue({ data: CATALOG_ENTRIES, error: null }),
        }
      }
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {}
    })
    mockSupabase.rpc.mockResolvedValue({ error: null })

    // Request facturation only (which requires crm)
    const result = await applyClientModuleConfig(CLIENT_ID, ['facturation'])

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()

    // Should include: facturation (requested) + crm (dependency) + 4 defaults
    const applied = result.data!.applied
    expect(applied).toContain('facturation')
    expect(applied).toContain('crm') // cascaded dependency
    expect(applied).toContain('core-dashboard') // default
    expect(applied).toContain('chat') // default
    expect(applied).toContain('documents') // default
    expect(applied).toContain('elio') // default

    // Cascaded should include crm + 4 defaults
    expect(result.data!.cascaded).toContain('crm')
    expect(result.data!.cascaded).toContain('core-dashboard')

    // Verify RPC was called with all modules
    expect(mockSupabase.rpc).toHaveBeenCalledWith('apply_client_module_config', {
      p_client_id: CLIENT_ID,
      p_module_keys: expect.arrayContaining(['facturation', 'crm', 'core-dashboard', 'chat', 'documents', 'elio']),
    })
  })

  it('should reject unknown module keys', async () => {
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
      if (table === 'module_catalog') {
        return {
          select: vi.fn().mockResolvedValue({ data: CATALOG_ENTRIES, error: null }),
        }
      }
      return {}
    })

    const result = await applyClientModuleConfig(CLIENT_ID, ['non-existent-module'])
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should reject inactive modules', async () => {
    const catalogWithInactive = [
      ...CATALOG_ENTRIES,
      { module_key: 'analytics', is_default: false, requires_modules: [], is_active: false },
    ]

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
      if (table === 'module_catalog') {
        return {
          select: vi.fn().mockResolvedValue({ data: catalogWithInactive, error: null }),
        }
      }
      return {}
    })

    const result = await applyClientModuleConfig(CLIENT_ID, ['analytics'])
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('MODULE_INACTIVE')
  })
})
