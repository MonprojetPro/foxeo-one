import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toggleMaintenanceMode } from './toggle-maintenance'

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@foxeo/supabase'

function makeSupabaseMock(overrides: {
  getUser?: { data: { user: { id: string } | null }; error: null | { message: string } }
  operator?: { data: { id: string } | null; error: null | { message: string } }
  upsertResult?: { error: null | { message: string } }
  insertResult?: { error: null }
} = {}) {
  const getUser = overrides.getUser ?? { data: { user: { id: 'user-1' } }, error: null }
  const operator = overrides.operator ?? { data: { id: 'op-1' }, error: null }
  const upsertResult = overrides.upsertResult ?? { error: null }
  const insertResult = overrides.insertResult ?? { error: null }

  const systemConfigMock = {
    upsert: vi.fn().mockResolvedValue(upsertResult),
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue(getUser),
    },
    from: vi.fn((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(operator),
        }
      }
      if (table === 'system_config') {
        return systemConfigMock
      }
      if (table === 'activity_logs') {
        return {
          insert: vi.fn().mockResolvedValue(insertResult),
        }
      }
      return {}
    }),
  }

  return supabase
}

describe('toggleMaintenanceMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns UNAUTHORIZED when user not authenticated', async () => {
    const supabase = makeSupabaseMock({
      getUser: { data: { user: null }, error: null },
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await toggleMaintenanceMode({ enabled: true, message: 'Maintenance', estimatedDuration: null })
    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(result.data).toBeNull()
  })

  it('returns UNAUTHORIZED when operator not found', async () => {
    const supabase = makeSupabaseMock({
      operator: { data: null, error: { message: 'Not found' } },
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await toggleMaintenanceMode({ enabled: true, message: 'Maintenance', estimatedDuration: null })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for empty message', async () => {
    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await toggleMaintenanceMode({ enabled: true, message: '', estimatedDuration: null })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns DATABASE_ERROR when upsert fails', async () => {
    const supabase = makeSupabaseMock({
      upsertResult: { error: { message: 'DB error' } },
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await toggleMaintenanceMode({ enabled: true, message: 'Maintenance', estimatedDuration: null })
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('succeeds and returns enabled=true on activation', async () => {
    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await toggleMaintenanceMode({ enabled: true, message: 'En maintenance', estimatedDuration: '2h' })
    expect(result.error).toBeNull()
    expect(result.data?.enabled).toBe(true)
  })

  it('succeeds and returns enabled=false on deactivation', async () => {
    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await toggleMaintenanceMode({ enabled: false, message: 'Retour en ligne', estimatedDuration: null })
    expect(result.error).toBeNull()
    expect(result.data?.enabled).toBe(false)
  })
})
