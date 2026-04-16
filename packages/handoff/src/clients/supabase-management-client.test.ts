import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseProject } from './supabase-management-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSupabaseProject', () => {
  it('creates a project, polls until ready, and returns keys', async () => {
    // Create project
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'proj-uuid-123' }),
    })
    // Poll project ready
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ACTIVE_HEALTHY' }),
    })
    // Get API keys
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { name: 'anon', api_key: 'anon-key-abc' },
        { name: 'service_role', api_key: 'svc-key-xyz' },
      ]),
    })

    const result = await createSupabaseProject('token', {
      name: 'monprojetpro-test',
      organizationId: 'org-id',
      dbPassword: 'strong-password',
    })

    expect(result.success).toBe(true)
    expect(result.data?.supabaseUrl).toBe('https://proj-uuid-123.supabase.co')
    expect(result.data?.anonKey).toBe('anon-key-abc')
    expect(result.data?.serviceRoleKey).toBe('svc-key-xyz')
  })

  it('returns MANUAL_FALLBACK on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })

    const result = await createSupabaseProject('bad-token', {
      name: 'test',
      organizationId: 'org',
      dbPassword: 'pass',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('MANUAL_FALLBACK')
  })

  it('returns MANUAL_FALLBACK on 503', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    })

    const result = await createSupabaseProject('token', {
      name: 'test',
      organizationId: 'org',
      dbPassword: 'pass',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('MANUAL_FALLBACK')
  })

  it('returns error if API keys are missing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'proj-id' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ACTIVE_HEALTHY' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]), // No keys
      })

    const result = await createSupabaseProject('token', {
      name: 'test',
      organizationId: 'org',
      dbPassword: 'pass',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('API keys not found')
  })
})
