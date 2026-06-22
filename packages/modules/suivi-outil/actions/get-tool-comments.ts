'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { rowToToolPostComment } from '../types/tool-post.types'
import type { ToolPostComment, ToolPostCommentRow } from '../types/tool-post.types'

export async function getToolComments(postId: string): Promise<ActionResponse<ToolPostComment[]>> {
  if (!postId) return errorResponse('postId requis', 'MISSING_POST_ID')

  const supabase = await createServerSupabaseClient()

  // Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) return errorResponse('Non authentifié', 'AUTH_REQUIRED')

  // Récupérer les commentaires — RLS garantit que seul le bon client/opérateur les voit
  const { data: rows, error: fetchError } = await supabase
    .from('tool_post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (fetchError) {
    return errorResponse(
      'Erreur lors de la récupération des commentaires',
      'FETCH_ERROR',
      fetchError.message
    )
  }

  if (!rows || rows.length === 0) return successResponse([])

  return successResponse((rows as ToolPostCommentRow[]).map(rowToToolPostComment))
}
