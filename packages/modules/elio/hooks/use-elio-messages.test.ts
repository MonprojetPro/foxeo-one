import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useElioMessages } from './use-elio-messages'

const mockGetMessages = vi.fn()

vi.mock('../actions/get-messages', () => ({
  getMessages: (...args: unknown[]) => mockGetMessages(...args),
  PAGE_SIZE: 50,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const MOCK_MESSAGES = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user' as const,
    content: 'Bonjour Élio',
    metadata: {},
    createdAt: '2026-03-02T09:00:00Z',
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant' as const,
    content: 'Bonjour ! Comment puis-je vous aider ?',
    metadata: {},
    createdAt: '2026-03-02T09:01:00Z',
  },
]

describe('useElioMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne les messages de la conversation active', async () => {
    mockGetMessages.mockResolvedValueOnce({ data: MOCK_MESSAGES, error: null })

    const { result } = renderHook(() => useElioMessages('conv-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]?.id).toBe('msg-1')
    expect(result.current.error).toBeNull()
  })

  it('n\'appelle pas getMessages si conversationId est null', async () => {
    const { result } = renderHook(() => useElioMessages(null), {
      wrapper: createWrapper(),
    })

    await new Promise((r) => setTimeout(r, 50))
    expect(mockGetMessages).not.toHaveBeenCalled()
    expect(result.current.messages).toEqual([])
  })

  it('retourne hasNextPage=true si une page complète (50 messages) est retournée', async () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      conversationId: 'conv-1',
      role: 'user' as const,
      content: `Message ${i}`,
      metadata: {},
      createdAt: '2026-03-02T09:00:00Z',
    }))

    mockGetMessages.mockResolvedValueOnce({ data: fullPage, error: null })

    const { result } = renderHook(() => useElioMessages('conv-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasNextPage).toBe(true)
  })

  it('retourne hasNextPage=false si moins de 50 messages', async () => {
    mockGetMessages.mockResolvedValueOnce({ data: MOCK_MESSAGES, error: null })

    const { result } = renderHook(() => useElioMessages('conv-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasNextPage).toBe(false)
  })

  it('permet de charger la page suivante via fetchNextPage', async () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-p1-${i}`,
      conversationId: 'conv-1',
      role: 'user' as const,
      content: `Message page 1 #${i}`,
      metadata: {},
      createdAt: '2026-03-02T09:00:00Z',
    }))

    const secondPage = [
      {
        id: 'msg-old-1',
        conversationId: 'conv-1',
        role: 'user' as const,
        content: 'Vieux message',
        metadata: {},
        createdAt: '2026-03-01T09:00:00Z',
      },
    ]

    mockGetMessages
      .mockResolvedValueOnce({ data: fullPage, error: null })
      .mockResolvedValueOnce({ data: secondPage, error: null })

    const { result } = renderHook(() => useElioMessages('conv-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))

    // Les messages anciens (page 2) apparaissent AVANT les récents (page 1)
    expect(result.current.messages[0]?.id).toBe('msg-old-1')
    expect(result.current.messages).toHaveLength(51)
  })
})
