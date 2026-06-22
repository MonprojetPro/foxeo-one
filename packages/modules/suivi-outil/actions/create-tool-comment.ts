'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { createNotification } from '@monprojetpro/modules-notifications'
import {
  ToolPostCommentSchema,
  rowToToolPostComment,
} from '../types/tool-post.types'
import type { ToolPostComment, ToolPostCommentRow } from '../types/tool-post.types'

const MAX_COMMENT_IMAGES = 3
const BUCKET = 'tool-screenshots'
const SIGNED_URL_EXPIRY = 3600 // 1 heure

export async function createToolComment(input: {
  postId: string
  body: string
  imagePaths?: string[]
}): Promise<ActionResponse<ToolPostComment>> {
  const supabase = await createServerSupabaseClient()

  // 1. Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) return errorResponse('Non authentifié', 'AUTH_REQUIRED')

  const uid = user.id

  // 2. Déterminer si c'est un client ou un opérateur
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, auth_user_id')
    .eq('auth_user_id', uid)
    .maybeSingle()

  const isClient = !!clientRecord

  let clientId: string
  let authorType: 'client' | 'operator'

  if (isClient) {
    clientId = clientRecord!.id as string
    authorType = 'client'
  } else {
    // Vérifier que c'est bien un opérateur
    const { data: operatorRecord } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', uid)
      .maybeSingle()

    if (!operatorRecord) {
      return errorResponse('Accès non autorisé', 'FORBIDDEN')
    }

    // Pour un opérateur, on récupère le client_id depuis le post
    const { data: post } = await supabase
      .from('tool_posts')
      .select('client_id')
      .eq('id', input.postId)
      .maybeSingle()

    if (!post) {
      return errorResponse('Post introuvable', 'NOT_FOUND')
    }

    clientId = post.client_id as string
    authorType = 'operator'
  }

  // 3. Validation Zod
  const parsed = ToolPostCommentSchema.safeParse({
    postId: input.postId,
    clientId,
    body: input.body,
    imagePaths: input.imagePaths ?? [],
  })
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Données invalides',
      'VALIDATION_ERROR',
      parsed.error.flatten()
    )
  }

  // Vérification limite images (défense en profondeur côté serveur)
  if (parsed.data.imagePaths.length > MAX_COMMENT_IMAGES) {
    return errorResponse(
      `Maximum ${MAX_COMMENT_IMAGES} images autorisées par commentaire`,
      'TOO_MANY_IMAGES'
    )
  }

  // 4. INSERT tool_post_comments
  const { data: row, error: insertError } = await supabase
    .from('tool_post_comments')
    .insert({
      post_id: parsed.data.postId,
      client_id: parsed.data.clientId,
      author_type: authorType,
      author_id: uid,
      body: parsed.data.body,
      image_paths: parsed.data.imagePaths,
    })
    .select()
    .single()

  if (insertError || !row) {
    return errorResponse(
      'Erreur lors de la création du commentaire',
      'INSERT_ERROR',
      insertError?.message
    )
  }

  // 5. Notification best-effort à l'autre partie
  try {
    if (authorType === 'client') {
      // Client a commenté → notifier l'opérateur
      const { data: postWithOp } = await supabase
        .from('tool_posts')
        .select('operator_id, operators!inner(auth_user_id)')
        .eq('id', input.postId)
        .maybeSingle()

      const operatorAuthUserId = (postWithOp as Record<string, unknown> | null)
        ?.operators as { auth_user_id: string } | undefined

      if (operatorAuthUserId?.auth_user_id) {
        await createNotification({
          recipientType: 'operator',
          recipientId: operatorAuthUserId.auth_user_id,
          type: 'tool_comment',
          title: 'Nouvelle réaction client',
          body: parsed.data.body.slice(0, 100),
          link: `/modules/suivi-outil/${clientId}`,
        })
      }
    } else {
      // Opérateur a commenté → notifier le client
      const { data: clientData } = await supabase
        .from('clients')
        .select('auth_user_id')
        .eq('id', clientId)
        .maybeSingle()

      if (clientData?.auth_user_id) {
        await createNotification({
          recipientType: 'client',
          recipientId: clientData.auth_user_id as string,
          type: 'tool_comment',
          title: 'Nouvelle réponse sur votre suivi',
          body: parsed.data.body.slice(0, 100),
          link: '/modules/suivi-outil',
        })
      }
    }
  } catch (notifError) {
    console.error('[suivi-outil] Erreur notification commentaire:', notifError)
  }

  const commentRow = row as ToolPostCommentRow

  // 6. Générer signed URLs pour les images du commentaire
  let imageUrls: string[] = []
  if (commentRow.image_paths && commentRow.image_paths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(commentRow.image_paths, SIGNED_URL_EXPIRY)
    imageUrls = (signedUrls ?? []).map((s) => s.signedUrl ?? '')
  }

  return successResponse(rowToToolPostComment(commentRow, imageUrls))
}
