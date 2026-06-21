'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'

const BUCKET = 'tool-screenshots'

export async function deleteToolPost(postId: string): Promise<ActionResponse<{ deleted: boolean }>> {
  if (!postId) return errorResponse('postId requis', 'MISSING_POST_ID')

  const supabase = await createServerSupabaseClient()

  // Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) return errorResponse('Non authentifié', 'AUTH_REQUIRED')

  // Récupérer l'operator UUID (≠ auth user id)
  const { data: operatorRecord } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!operatorRecord) return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')
  const operatorId = operatorRecord.id as string

  // Récupérer le post pour vérifier l'ownership et avoir les image_paths
  const { data: post, error: fetchError } = await supabase
    .from('tool_posts')
    .select('operator_id, image_paths')
    .eq('id', postId)
    .single()

  if (fetchError || !post) return errorResponse('Post introuvable', 'NOT_FOUND')
  if (post.operator_id !== operatorId) {
    return errorResponse("Vous n'êtes pas l'auteur de ce post", 'FORBIDDEN')
  }

  // Supprimer le post (la RLS is_operator() agit aussi comme garde-fou)
  const { error: deleteError } = await supabase.from('tool_posts').delete().eq('id', postId)

  if (deleteError) {
    return errorResponse(
      'Erreur lors de la suppression du post',
      'DELETE_ERROR',
      deleteError.message
    )
  }

  // Supprimer les images du storage (best effort — non bloquant)
  const imagePaths = post.image_paths as string[] | null
  if (imagePaths && imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(imagePaths)
    if (storageError) {
      console.error('[suivi-outil] Erreur suppression images storage:', storageError.message)
    }
  }

  return successResponse({ deleted: true })
}
