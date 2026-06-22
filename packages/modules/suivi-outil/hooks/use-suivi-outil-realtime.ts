'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@monprojetpro/supabase/client'
import { toolPostsQueryKey } from './use-tool-posts'
import { toolCommentsQueryKey } from './use-tool-comments'

export function useSuiviOutilRealtime(clientId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!clientId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`tool-posts:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tool_posts',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: toolPostsQueryKey(clientId) })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tool_post_comments',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const postId = (payload.new as { post_id?: string })?.post_id
          if (postId) {
            queryClient.invalidateQueries({ queryKey: toolCommentsQueryKey(postId) })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, queryClient])
}
