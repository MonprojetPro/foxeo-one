'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { UpdateToolPostSchema, rowToToolPost } from '../types/tool-post.types'
import type { ToolPost, ToolPostRow } from '../types/tool-post.types'

export async function updateToolPost(input: unknown): Promise<ActionResponse<ToolPost>> {
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

  // Validation Zod
  const parsed = UpdateToolPostSchema.safeParse(input)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Données invalides',
      'VALIDATION_ERROR',
      parsed.error.flatten()
    )
  }
  const { postId, title, body } = parsed.data

  // Vérifier que le post appartient à cet opérateur
  const { data: existingPost } = await supabase
    .from('tool_posts')
    .select('operator_id')
    .eq('id', postId)
    .single()

  if (!existingPost) return errorResponse('Post introuvable', 'NOT_FOUND')
  if (existingPost.operator_id !== operatorId) {
    return errorResponse("Vous n'êtes pas l'auteur de ce post", 'FORBIDDEN')
  }

  // Build update payload — on laisse le trigger updated_at gérer le timestamp
  const updatePayload: Record<string, unknown> = {}
  if (title !== undefined) updatePayload.title = title
  if (body !== undefined) updatePayload.body = body

  const { data: row, error: updateError } = await supabase
    .from('tool_posts')
    .update(updatePayload)
    .eq('id', postId)
    .select()
    .single()

  if (updateError || !row) {
    return errorResponse(
      'Erreur lors de la mise à jour du post',
      'UPDATE_ERROR',
      updateError?.message
    )
  }

  return successResponse(rowToToolPost(row as ToolPostRow, []))
}
