import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createVercelProject, connectGitRepo, pollDeploymentStatus, buildHandoffEnvVars } from './vercel-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createVercelProject', () => {
  it('creates a project and sets env vars', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'prj_123', accountId: 'team_1', name: 'monprojetpro-test' }),
      })

    const result = await createVercelProject('token', 'monprojetpro-test', [])

    expect(result.success).toBe(true)
    expect(result.data?.projectId).toBe('prj_123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.vercel.com/v11/projects',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    })

    const result = await createVercelProject('bad-token', 'test', [])

    expect(result.success).toBe(false)
    expect(result.error).toContain('403')
  })

  it('sets env vars after project creation', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'prj_456', accountId: 'team_1', name: 'test' }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

    const envVars = [{ key: 'TEST_KEY', value: 'test_val', target: ['production' as const], type: 'plain' as const }]
    const result = await createVercelProject('token', 'test', envVars)

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('returns error if env var setting fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'prj_789', accountId: 'team_1', name: 'test' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid env var'),
      })

    const envVars = [{ key: 'BAD', value: '', target: ['production' as const], type: 'plain' as const }]
    const result = await createVercelProject('token', 'test', envVars)

    expect(result.success).toBe(false)
    expect(result.error).toContain('BAD')
  })
})

describe('connectGitRepo', () => {
  it('connects a git repo to vercel project', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

    const result = await connectGitRepo('token', 'prj_123', 'org/repo')

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.vercel.com/v9/projects/prj_123/link',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    })

    const result = await connectGitRepo('token', 'invalid', 'org/repo')

    expect(result.success).toBe(false)
    expect(result.error).toContain('404')
  })
})

describe('pollDeploymentStatus', () => {
  it('returns deployment URL when ready', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        deployments: [{ state: 'READY', url: 'test-abc.vercel.app' }],
      }),
    })

    const result = await pollDeploymentStatus('token', 'prj_123')

    expect(result.success).toBe(true)
    expect(result.data).toBe('https://test-abc.vercel.app')
  })

  it('returns error on deployment failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        deployments: [{ state: 'ERROR', url: 'failed-abc.vercel.app' }],
      }),
    })

    const result = await pollDeploymentStatus('token', 'prj_123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Deployment failed')
  })
})

describe('buildHandoffEnvVars', () => {
  it('builds correct env vars for handoff', () => {
    const envVars = buildHandoffEnvVars('https://test.supabase.co', 'anon-key-123')

    expect(envVars).toHaveLength(4)
    expect(envVars.find(v => v.key === 'NEXT_PUBLIC_ENABLE_LAB_MODULE')?.value).toBe('false')
    expect(envVars.find(v => v.key === 'NEXT_PUBLIC_ENABLE_AGENTS')?.value).toBe('false')
    expect(envVars.find(v => v.key === 'NEXT_PUBLIC_SUPABASE_URL')?.value).toBe('https://test.supabase.co')
    expect(envVars.find(v => v.key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY')?.value).toBe('anon-key-123')
  })
})
