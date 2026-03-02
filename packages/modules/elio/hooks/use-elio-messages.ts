'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { getMessages, PAGE_SIZE } from '../actions/get-messages'
import type { ElioMessagePersisted } from '../types/elio.types'

interface UseElioMessagesReturn {
  messages: ElioMessagePersisted[]
  isLoading: boolean
  error: string | null
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
}

/**
 * Hook — Messages d'une conversation Élio avec pagination inverse.
 * QueryKey: ['elio-messages', conversationId]
 * Pagination: 50 messages par page, les plus anciens via "Charger les messages précédents".
 */
export function useElioMessages(conversationId: string | null): UseElioMessagesReturn {
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['elio-messages', conversationId],
    queryFn: ({ pageParam }) => getMessages(conversationId!, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const messages = lastPage.data ?? []
      return messages.length === PAGE_SIZE ? allPages.length : undefined
    },
    initialPageParam: 0,
    enabled: Boolean(conversationId),
    staleTime: 30 * 1000, // 30 secondes
    refetchOnWindowFocus: false,
    select: (infiniteData) => {
      // Aplatir toutes les pages en ordre chronologique
      // Page 0 = les plus récents, fetchNextPage charge les plus anciens
      const allMessages: ElioMessagePersisted[] = []
      // Les pages sont dans l'ordre de fetch; inverser pour avoir ancien → récent
      for (let i = infiniteData.pages.length - 1; i >= 0; i--) {
        const pageMessages = infiniteData.pages[i]?.data ?? []
        allMessages.push(...pageMessages)
      }
      return allMessages
    },
  })

  return {
    messages: data ?? [],
    isLoading,
    error: error ? String(error) : null,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    isFetchingNextPage,
  }
}
