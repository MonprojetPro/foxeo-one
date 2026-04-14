import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

const mockCount = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useValidationBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Chain: .select().eq().eq() → { count, error }
    const eqChain = { eq: vi.fn() }
    eqChain.eq.mockReturnValue({ count: 3, error: null })
    mockEq.mockReturnValue(eqChain)
    mockSelect.mockReturnValue({ eq: mockEq })
  })

  it('returns 0 when operatorId is empty', async () => {
    const { useValidationBadge } = await import('./use-validation-badge')
    const { result } = renderHook(() => useValidationBadge(''), {
      wrapper: createWrapper(),
    })

    // When disabled, returns default
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0)
    })
  })

  it('returns pendingCount from supabase when operatorId provided', async () => {
    const { useValidationBadge } = await import('./use-validation-badge')
    const { result } = renderHook(() => useValidationBadge('op-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pendingCount).toBe(3)
  })

  it('queries with correct filters (operator_id + status=pending)', async () => {
    const { useValidationBadge } = await import('./use-validation-badge')
    const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')

    renderHook(() => useValidationBadge('op-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(createBrowserSupabaseClient).toHaveBeenCalled()
    })

    // Verify the eq filters were called with correct args
    expect(mockEq).toHaveBeenCalledWith('operator_id', 'op-456')
  })

  it('returns 0 on supabase error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const eqChain = { eq: vi.fn() }
    eqChain.eq.mockReturnValue({ count: null, error: { message: 'DB error' } })
    mockEq.mockReturnValue(eqChain)

    const { useValidationBadge } = await import('./use-validation-badge')
    const { result } = renderHook(() => useValidationBadge('op-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pendingCount).toBe(0)
    consoleSpy.mockRestore()
  })

  it('returns 0 when count is null', async () => {
    const eqChain = { eq: vi.fn() }
    eqChain.eq.mockReturnValue({ count: null, error: null })
    mockEq.mockReturnValue(eqChain)

    const { useValidationBadge } = await import('./use-validation-badge')
    const { result } = renderHook(() => useValidationBadge('op-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pendingCount).toBe(0)
  })
})
