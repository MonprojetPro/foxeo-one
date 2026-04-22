import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useUnreadInjections } from './use-unread-injections'

const mockIs = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

const CLIENT_ID = 'cccccccc-0000-0000-0000-000000000001'
const STEP_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const STEP_B = 'bbbbbbbb-0000-0000-0000-000000000002'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return createElement(QueryClientProvider, { client: queryClient }, children)
}

function buildMock(rows: { step_id: string }[] | null, error: unknown = null) {
  mockIs.mockResolvedValue({ data: rows, error })
  mockEq.mockReturnValue({ is: mockIs })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

describe('useUnreadInjections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne {} si clientId vide', async () => {
    const { result } = renderHook(() => useUnreadInjections(''), { wrapper })
    await waitFor(() => !result.current.isLoading)
    expect(result.current.unreadByStep).toEqual({})
  })

  it('retourne les counts groupés par step_id', async () => {
    buildMock([
      { step_id: STEP_A },
      { step_id: STEP_A },
      { step_id: STEP_B },
    ])

    const { result } = renderHook(() => useUnreadInjections(CLIENT_ID), { wrapper })

    await waitFor(() => {
      expect(result.current.unreadByStep[STEP_A]).toBe(2)
    })
    expect(result.current.unreadByStep[STEP_B]).toBe(1)
  })

  it('retourne {} si aucune injection non lue', async () => {
    buildMock([])

    const { result } = renderHook(() => useUnreadInjections(CLIENT_ID), { wrapper })

    await waitFor(() => !result.current.isLoading)
    expect(result.current.unreadByStep).toEqual({})
  })

  it('retourne {} en cas d\'erreur Supabase', async () => {
    buildMock(null, { message: 'network error' })

    const { result } = renderHook(() => useUnreadInjections(CLIENT_ID), { wrapper })

    await waitFor(() => !result.current.isLoading)
    expect(result.current.unreadByStep).toEqual({})
  })
})
