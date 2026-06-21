'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getToolPosts } from '../actions/get-tool-posts'
import { createToolPost } from '../actions/create-tool-post'
import { updateToolPost } from '../actions/update-tool-post'
import { deleteToolPost } from '../actions/delete-tool-post'
import type { UpdateToolPostInput } from '../types/tool-post.types'

export const toolPostsQueryKey = (clientId: string) => ['tool-posts', clientId] as const

export function useToolPosts(clientId: string) {
  const queryClient = useQueryClient()

  // ── Query ─────────────────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: toolPostsQueryKey(clientId),
    queryFn: () => getToolPosts(clientId),
    enabled: !!clientId,
    staleTime: 30_000, // 30 secondes — Realtime invalide au besoin
    select: (response) => response.data ?? [],
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => createToolPost(formData),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: toolPostsQueryKey(clientId) })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateToolPostInput) => updateToolPost(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: toolPostsQueryKey(clientId) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => deleteToolPost(postId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: toolPostsQueryKey(clientId) })
    },
  })

  return {
    posts: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    // Create
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.data?.error ?? null,
    // Update
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    // Delete
    remove: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
