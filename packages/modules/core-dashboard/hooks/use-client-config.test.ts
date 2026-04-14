import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ClientConfig } from '@monprojetpro/types'

// Mock the server action
const mockGetClientConfig = vi.fn()
vi.mock('../actions/get-client-config', () => ({
  getClientConfig: (...args: unknown[]) => mockGetClientConfig(...args),
}))

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey, queryFn, enabled, staleTime }: {
    queryKey: unknown[]
    queryFn: () => Promise<unknown>
    enabled: boolean
    staleTime: number
  }) => ({
    queryKey,
    queryFn,
    enabled,
    staleTime,
  })),
}))

const { useQuery } = await import('@tanstack/react-query')

describe('useClientConfig hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses correct queryKey', async () => {
    const { useClientConfig } = await import('./use-client-config')
    useClientConfig('client-abc')

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['client-config', 'client-abc'],
      })
    )
  })

  it('sets staleTime to 5 minutes', async () => {
    const { useClientConfig } = await import('./use-client-config')
    useClientConfig('client-abc')

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 5 * 60 * 1000,
      })
    )
  })

  it('disables query when clientId is empty', async () => {
    const { useClientConfig } = await import('./use-client-config')
    useClientConfig('')

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    )
  })

  it('enables query when clientId is provided', async () => {
    const { useClientConfig } = await import('./use-client-config')
    useClientConfig('client-xyz')

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    )
  })

  it('queryFn returns null when clientId is empty', async () => {
    const { useClientConfig } = await import('./use-client-config')
    useClientConfig('')

    const callArgs = vi.mocked(useQuery).mock.calls[0]?.[0]
    const result = await callArgs?.queryFn?.()
    expect(result).toBeNull()
  })

  it('queryFn calls getClientConfig and returns data on success', async () => {
    const mockConfig: ClientConfig = {
      id: 'cfg-1',
      clientId: 'client-1',
      dashboardType: 'one',
      activeModules: ['core-dashboard', 'chat'],
      themeVariant: 'one',
      density: 'comfortable',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    mockGetClientConfig.mockResolvedValueOnce({ data: mockConfig, error: null })

    const { useClientConfig } = await import('./use-client-config')
    useClientConfig('client-1')

    const callArgs = vi.mocked(useQuery).mock.calls[0]?.[0]
    const result = await callArgs?.queryFn?.()
    expect(result).toEqual(mockConfig)
    expect(mockGetClientConfig).toHaveBeenCalledWith('client-1')
  })

  it('queryFn throws on error response', async () => {
    mockGetClientConfig.mockResolvedValueOnce({
      data: null,
      error: { message: 'Config introuvable', code: 'NOT_FOUND' },
    })

    const { useClientConfig } = await import('./use-client-config')
    useClientConfig('client-bad')

    const callArgs = vi.mocked(useQuery).mock.calls[0]?.[0]
    await expect(callArgs?.queryFn?.()).rejects.toThrow('Config introuvable')
  })
})
