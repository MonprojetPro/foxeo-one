import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGitHubRepo, pushToRepo } from './github-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createGitHubRepo', () => {
  it('creates a private repo on the org', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        html_url: 'https://github.com/MonprojetPro/monprojetpro-test',
        clone_url: 'https://github.com/MonprojetPro/monprojetpro-test.git',
      }),
    })

    const result = await createGitHubRepo('token', 'MonprojetPro', 'monprojetpro-test')

    expect(result.success).toBe(true)
    expect(result.data?.repoUrl).toBe('https://github.com/MonprojetPro/monprojetpro-test')
    expect(result.data?.cloneUrl).toContain('.git')

    const fetchCall = mockFetch.mock.calls[0]
    expect(fetchCall[0]).toBe('https://api.github.com/orgs/MonprojetPro/repos')
    const body = JSON.parse(fetchCall[1].body)
    expect(body.private).toBe(true)
    expect(body.name).toBe('monprojetpro-test')
  })

  it('returns error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Repository creation failed'),
    })

    const result = await createGitHubRepo('token', 'MonprojetPro', 'existing-repo')

    expect(result.success).toBe(false)
    expect(result.error).toContain('422')
  })
})

describe('pushToRepo', () => {
  it('creates blobs, tree, commit and ref', async () => {
    // Blob
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sha: 'blob-sha-1' }),
    })
    // Tree
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sha: 'tree-sha-1' }),
    })
    // Commit
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sha: 'commit-sha-1' }),
    })
    // Ref
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const files = [{ path: 'README.md', content: '# Test' }]
    const result = await pushToRepo('token', 'org/repo', files)

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it('returns error if blob creation fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('blob error'),
    })

    const result = await pushToRepo('token', 'org/repo', [{ path: 'a.txt', content: 'x' }])

    expect(result.success).toBe(false)
    expect(result.error).toContain('createBlob')
  })
})
