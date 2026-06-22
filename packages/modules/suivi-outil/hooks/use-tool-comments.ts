'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getToolComments } from '../actions/get-tool-comments'
import { createToolComment } from '../actions/create-tool-comment'

export const toolCommentsQueryKey = (postId: string) => ['tool-comments', postId] as const

export function useToolComments(postId: string) {
  const query = useQuery({
    queryKey: toolCommentsQueryKey(postId),
    queryFn: () => getToolComments(postId),
    enabled: !!postId,
    staleTime: 30_000,
    select: (response) => response.data ?? [],
  })

  return {
    comments: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
  }
}

export function useCreateToolComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ body, imagePaths }: { body: string; imagePaths?: string[] }) =>
      createToolComment({ postId, body, imagePaths }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: toolCommentsQueryKey(postId) })
    },
  })
}
