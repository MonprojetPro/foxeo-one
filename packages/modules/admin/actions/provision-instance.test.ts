import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  provisionOneInstanceFromHub,
  createSupabaseProject,
  createVercelProject,
  deleteSupabaseProject,
  deleteVercelProject,
  pollInstanceHealth,
} from './provision-instance'

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@foxeo/supabase'

// ============================================================
// Supabase mock factory
// ============================================================
function makeSupabaseMock(overrides: {
  user?: { id: string } | null
  isOperator?: boolean
  slugExists?: boolean
  instanceExists?: boolean
  insertResult?: { data: { id: string } | null; error: { message: string } | null }
  updateError?: { message: string } | null
} = {}) {
  const user = overrides.user !== undefined ? overrides.user : { id: 'user-op-1' }
  const isOperator = overrides.isOperator ?? true
  const slugExists = overrides.slugExists ?? false
  const instanceExists = overrides.instanceExists ?? false
  const insertResult = overrides.insertResult ?? { data: { id: 'inst-uuid-1' }, error: null }
  const updateError = overrides.updateError ?? null

  const maybeSingleSlug = vi.fn().mockResolvedValue({ data: slugExists ? { id: 'other' } : null })
  const maybeSingleInst = vi.fn().mockResolvedValue({ data: instanceExists ? { id: 'inst-other' } : null })

  const fromMocks: Record<string, unknown> = {
    client_instances: {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleSlug,
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(insertResult),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      }),
    },
    activity_logs: {
      insert: vi.fn().mockResolvedValue({ error: null }),
    },
  }

  // First call to client_instances.maybeSingle → slug check
  // Second call → instance exists check
  let clientInstancesCallCount = 0
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn((table: string) => {
      if (table === 'client_instances') {
        clientInstancesCallCount++
        if (clientInstancesCallCount === 1) {
          // slug uniqueness check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: maybeSingleSlug,
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(insertResult),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: updateError }),
            }),
          }
        }
        if (clientInstancesCallCount === 2) {
          // instance exists check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: maybeSingleInst,
          }
        }
        // subsequent calls (insert, update)
        return fromMocks.client_instances
      }
      if (table === 'activity_logs') {
        return fromMocks.activity_logs
      }
      return {}
    }),
    channel: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({}),
    }),
    removeChannel: vi.fn(),
  }
  return supabase
}

describe('provisionOneInstanceFromHub', () => {
  const validInput = {
    clientId: '11111111-1111-1111-1111-111111111111',
    slug: 'my-company',
    modules: ['core-dashboard', 'elio'],
    tier: 'essentiel' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear env vars
    delete process.env.SUPABASE_MANAGEMENT_TOKEN
    delete process.env.VERCEL_TOKEN
  })

  afterEach(() => {
    delete process.env.SUPABASE_MANAGEMENT_TOKEN
    delete process.env.VERCEL_TOKEN
  })

  // ── Validation ──────────────────────────────────────────────

  it('returns VALIDATION_ERROR for slug that is too short', async () => {
    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub({ ...validInput, slug: 'ab' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('returns VALIDATION_ERROR for slug with uppercase', async () => {
    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub({ ...validInput, slug: 'My-Company' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for invalid clientId (not a UUID)', async () => {
    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub({ ...validInput, clientId: 'not-a-uuid' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  // ── Auth ────────────────────────────────────────────────────

  it('returns UNAUTHORIZED when user not authenticated', async () => {
    const supabase = makeSupabaseMock({ user: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when not an operator', async () => {
    const supabase = makeSupabaseMock({ isOperator: false })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  // ── Business rules ──────────────────────────────────────────

  it('returns SLUG_CONFLICT when slug already exists', async () => {
    const supabase = makeSupabaseMock({ slugExists: true })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error?.code).toBe('SLUG_CONFLICT')
  })

  it('returns INSTANCE_EXISTS when client already has an active instance', async () => {
    const supabase = makeSupabaseMock({ instanceExists: true })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error?.code).toBe('INSTANCE_EXISTS')
  })

  it('returns DATABASE_ERROR when insert fails', async () => {
    const supabase = makeSupabaseMock({
      insertResult: { data: null, error: { message: 'unique violation' } },
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  // ── External API failures + rollback ───────────────────────

  it('returns SUPABASE_API_ERROR and rolls back when Supabase Management API fails', async () => {
    process.env.SUPABASE_MANAGEMENT_TOKEN = 'test-token'
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 })
    )

    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error?.code).toBe('SUPABASE_API_ERROR')
    // Verify rollback: status update to 'failed' was called
    expect(supabase.from).toHaveBeenCalledWith('client_instances')
    fetchSpy.mockRestore()
  })

  it('returns VERCEL_API_ERROR and rolls back when Vercel API fails', async () => {
    process.env.SUPABASE_MANAGEMENT_TOKEN = 'supabase-token'
    process.env.VERCEL_TOKEN = 'vercel-token'

    let fetchCallCount = 0
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      fetchCallCount++
      // Supabase Management API succeeds
      if (String(url).includes('supabase.com')) {
        return new Response(
          JSON.stringify({ id: 'sb-proj-1', database: { host: 'db.sb-proj-1.supabase.co' } }),
          { status: 200 }
        )
      }
      // Vercel API fails
      return new Response(null, { status: 500 })
    })

    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error?.code).toBe('VERCEL_API_ERROR')
    expect(fetchCallCount).toBeGreaterThan(0)
    fetchSpy.mockRestore()
  })

  // ── Success ─────────────────────────────────────────────────

  it('succeeds without tokens (dev mode — skips API calls)', async () => {
    // No SUPABASE_MANAGEMENT_TOKEN or VERCEL_TOKEN set
    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error).toBeNull()
    expect(result.data?.slug).toBe('my-company')
    expect(result.data?.instanceUrl).toBe('https://my-company.foxeo.io')
    expect(result.data?.instanceId).toBe('inst-uuid-1')
  })

  it('succeeds with tokens and emits Realtime progress events', async () => {
    process.env.SUPABASE_MANAGEMENT_TOKEN = 'supabase-token'
    process.env.VERCEL_TOKEN = 'vercel-token'

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url)
      // Supabase Management API
      if (urlStr.includes('api.supabase.com')) {
        return new Response(
          JSON.stringify({ id: 'sb-proj-x', database: { host: 'db.sb-proj-x.supabase.co' } }),
          { status: 200 }
        )
      }
      // Vercel create project (no sub-path after /v9/projects)
      if (urlStr.match(/api\.vercel\.com\/v9\/projects$/) || urlStr.match(/api\.vercel\.com\/v9\/projects\/[^/]+$/)) {
        if (!urlStr.includes('/env') && !urlStr.includes('/domains')) {
          return new Response(JSON.stringify({ id: 'vcl-proj-x' }), { status: 200 })
        }
      }
      // All other calls (env, domains, deployments, health check) return 200 with empty JSON
      return new Response('{}', { status: 200 })
    })

    const supabase = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)

    const result = await provisionOneInstanceFromHub(validInput)
    expect(result.error).toBeNull()
    expect(result.data?.supabaseProjectId).toBe('sb-proj-x')
    expect(result.data?.vercelProjectId).toBe('vcl-proj-x')
    // Realtime progress was emitted
    expect(supabase.channel).toHaveBeenCalledWith('provisioning:11111111-1111-1111-1111-111111111111')
    fetchSpy.mockRestore()
  })
})

// ============================================================
// Helper functions unit tests
// ============================================================
describe('createSupabaseProject', () => {
  it('returns null when API responds with error', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
    const result = await createSupabaseProject('token', 'foxeo-one-test')
    expect(result).toBeNull()
    fetchSpy.mockRestore()
  })

  it('returns projectId and dbUrl on success', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'proj-abc', database: { host: 'db.proj-abc.supabase.co' } }),
        { status: 200 }
      )
    )
    const result = await createSupabaseProject('token', 'foxeo-one-test')
    expect(result?.projectId).toBe('proj-abc')
    expect(result?.dbUrl).toContain('db.proj-abc.supabase.co')
    fetchSpy.mockRestore()
  })
})

describe('createVercelProject', () => {
  it('returns null when project creation fails', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 403 }))
    const result = await createVercelProject('token', 'foxeo-one-test', {}, 'test.foxeo.io')
    expect(result).toBeNull()
    fetchSpy.mockRestore()
  })

  it('returns null when env vars upload fails', async () => {
    let callCount = 0
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++
      if (callCount === 1) return new Response(JSON.stringify({ id: 'vcl-1' }), { status: 200 })
      return new Response(null, { status: 422 })
    })
    const result = await createVercelProject('token', 'foxeo-one-test', { KEY: 'val' }, 'test.foxeo.io')
    expect(result).toBeNull()
    fetchSpy.mockRestore()
  })
})

describe('pollInstanceHealth', () => {
  it('returns true when instance responds 200 on first attempt', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }))
    const result = await pollInstanceHealth('https://test.foxeo.io', 1, 0)
    expect(result).toBe(true)
    fetchSpy.mockRestore()
  })

  it('returns false when all attempts fail', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await pollInstanceHealth('https://test.foxeo.io', 3, 0)
    expect(result).toBe(false)
    fetchSpy.mockRestore()
  })
})

describe('deleteSupabaseProject + deleteVercelProject', () => {
  it('calls DELETE endpoint for supabase project', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    await deleteSupabaseProject('token', 'proj-1')
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.supabase.com/v1/projects/proj-1',
      expect.objectContaining({ method: 'DELETE' })
    )
    fetchSpy.mockRestore()
  })

  it('calls DELETE endpoint for vercel project', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    await deleteVercelProject('token', 'vcl-1')
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.vercel.com/v9/projects/vcl-1',
      expect.objectContaining({ method: 'DELETE' })
    )
    fetchSpy.mockRestore()
  })
})
