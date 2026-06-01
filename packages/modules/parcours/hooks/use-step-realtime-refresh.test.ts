import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useStepRealtimeRefresh } from './use-step-realtime-refresh'

const mockRefresh = vi.fn()
const mockRemoveChannel = vi.fn()
const mockSubscribe = vi.fn().mockReturnThis()
const mockHandlers: Array<(payload: unknown) => void> = []
const mockChannel = {
  on: vi.fn((_event: string, _cfg: unknown, cb: (payload: unknown) => void) => {
    mockHandlers.push(cb)
    return mockChannel
  }),
  subscribe: mockSubscribe,
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  })),
}))

function createWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useStepRealtimeRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandlers.length = 0
  })

  it('ne s’abonne pas si stepId est undefined', () => {
    renderHook(() => useStepRealtimeRefresh(undefined), { wrapper: createWrapper() })
    expect(mockChannel.on).not.toHaveBeenCalled()
  })

  it('s’abonne à client_parcours_agents ET step_submissions', () => {
    renderHook(() => useStepRealtimeRefresh('step-1'), { wrapper: createWrapper() })
    expect(mockChannel.on).toHaveBeenCalledTimes(2)
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('rafraîchit le rendu serveur + invalide les caches à la réception d’un événement', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    renderHook(() => useStepRealtimeRefresh('step-1'), { wrapper: createWrapper(qc) })

    expect(mockHandlers).toHaveLength(2)
    const [firstHandler] = mockHandlers
    firstHandler?.({})

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('se désabonne au démontage', () => {
    const { unmount } = renderHook(() => useStepRealtimeRefresh('step-1'), { wrapper: createWrapper() })
    unmount()
    expect(mockRemoveChannel).toHaveBeenCalled()
  })
})
