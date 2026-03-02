import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useElioConversations } from './use-elio-conversations'

const mockGetConversations = vi.fn()

vi.mock('../actions/get-conversations', () => ({
  getConversations: (...args: unknown[]) => mockGetConversations(...args),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    userId: 'user-1',
    dashboardType: 'lab' as const,
    title: 'Conversation récente',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-02T09:00:00Z',
  },
  {
    id: 'conv-2',
    userId: 'user-1',
    dashboardType: 'lab' as const,
    title: 'Conversation ancienne',
    createdAt: '2026-02-28T10:00:00Z',
    updatedAt: '2026-02-28T10:00:00Z',
  },
]

describe('useElioConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne les conversations triées (données du serveur)', async () => {
    mockGetConversations.mockResolvedValueOnce({ data: MOCK_CONVERSATIONS, error: null })

    const { result } = renderHook(
      () => useElioConversations({ userId: 'user-1', dashboardType: 'lab' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.conversations).toHaveLength(2)
    expect(result.current.conversations[0]?.id).toBe('conv-1')
    expect(result.current.error).toBeNull()
  })

  it('appelle getConversations avec le bon dashboardType', async () => {
    mockGetConversations.mockResolvedValueOnce({ data: [], error: null })

    renderHook(
      () => useElioConversations({ userId: 'user-1', dashboardType: 'hub' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(mockGetConversations).toHaveBeenCalledWith('hub')
    })
  })

  it('utilise la queryKey correcte avec userId et dashboardType', async () => {
    mockGetConversations.mockResolvedValueOnce({ data: [], error: null })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result } = renderHook(
      () => useElioConversations({ userId: 'user-42', dashboardType: 'one' }),
      {
        wrapper: ({ children }) =>
          createElement(QueryClientProvider, { client: queryClient }, children),
      }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Vérifier que la query est mise en cache avec la bonne clé
    const cache = queryClient.getQueriesData({ queryKey: ['elio-conversations', 'user-42', 'one'] })
    expect(cache.length).toBeGreaterThan(0)
  })

  it('retourne un tableau vide si aucune conversation', async () => {
    mockGetConversations.mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(
      () => useElioConversations({ userId: 'user-1', dashboardType: 'lab' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.conversations).toEqual([])
  })

  it('n\'appelle pas getConversations si userId est vide', async () => {
    mockGetConversations.mockResolvedValueOnce({ data: [], error: null })

    renderHook(
      () => useElioConversations({ userId: '', dashboardType: 'lab' }),
      { wrapper: createWrapper() }
    )

    // Attendre un peu — la query ne devrait pas se déclencher
    await new Promise((r) => setTimeout(r, 50))
    expect(mockGetConversations).not.toHaveBeenCalled()
  })

  it('n\'appelle pas getConversations si enabled=false', async () => {
    mockGetConversations.mockResolvedValueOnce({ data: [], error: null })

    renderHook(
      () => useElioConversations({ userId: 'user-1', dashboardType: 'lab', enabled: false }),
      { wrapper: createWrapper() }
    )

    await new Promise((r) => setTimeout(r, 50))
    expect(mockGetConversations).not.toHaveBeenCalled()
  })
})
