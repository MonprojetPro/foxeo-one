import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useClientToolTrackingSummary } from './use-client-tool-tracking-summary'
import type { ReactNode } from 'react'

const mockGetClientToolTrackingSummary = vi.fn()

vi.mock('../actions/get-client-tool-tracking-summary', () => ({
  getClientToolTrackingSummary: (...args: unknown[]) => mockGetClientToolTrackingSummary(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useClientToolTrackingSummary', () => {
  it('should not fetch if clientId is empty', () => {
    const { result } = renderHook(() => useClientToolTrackingSummary(''), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
    expect(mockGetClientToolTrackingSummary).not.toHaveBeenCalled()
  })

  it('should return summary data on success', async () => {
    const mockData = { postCount: 3, clientCommentCount: 7, lastActivityAt: '2026-06-21T08:00:00Z' }
    mockGetClientToolTrackingSummary.mockResolvedValue({ data: mockData, error: null })
    const { result } = renderHook(
      () => useClientToolTrackingSummary('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockData)
  })

  it('should return zeros fallback on null data', async () => {
    mockGetClientToolTrackingSummary.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(
      () => useClientToolTrackingSummary('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ postCount: 0, clientCommentCount: 0, lastActivityAt: null })
  })

  it('should be in error state when action returns an error', async () => {
    mockGetClientToolTrackingSummary.mockResolvedValue({
      data: null,
      error: { message: 'Erreur DB', code: 'DATABASE_ERROR' },
    })
    const { result } = renderHook(
      () => useClientToolTrackingSummary('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})
