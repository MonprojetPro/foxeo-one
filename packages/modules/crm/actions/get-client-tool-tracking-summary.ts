'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

export interface ToolTrackingSummary {
  /** Nombre de publications de l'opérateur pour ce client. */
  postCount: number
  /** Nombre de commentaires du client (author_type = 'client'). */
  clientCommentCount: number
  /** Date de la dernière activité (dernier post OU commentaire), null si aucune. */
  lastActivityAt: string | null
}

/**
 * Retourne un résumé de l'activité « Suivi de l'outil » pour un client donné.
 * Requête directe sur tool_posts / tool_post_comments — pas d'import cross-module.
 */
export async function getClientToolTrackingSummary(
  clientId: string
): Promise<ActionResponse<ToolTrackingSummary>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Vérifier que le client appartient bien à cet opérateur.
    const { data: clientRow, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single()

    if (clientError || !clientRow) {
      return errorResponse('Client introuvable ou accès refusé', 'NOT_FOUND')
    }

    // Récupérer les publications (id + created_at suffisent pour le comptage et la date).
    const { data: posts, error: postsError } = await supabase
      .from('tool_posts')
      .select('id, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('[CRM:TOOL_TRACKING_SUMMARY] Error fetching posts:', postsError)
      return errorResponse('Erreur lors du chargement des publications', 'DATABASE_ERROR', postsError)
    }

    const postIds = (posts ?? []).map((p) => p.id)

    // Récupérer les commentaires du client sur ces publications.
    let clientCommentCount = 0
    let lastCommentAt: string | null = null

    if (postIds.length > 0) {
      const { data: comments, error: commentsError } = await supabase
        .from('tool_post_comments')
        .select('id, created_at')
        .in('post_id', postIds)
        .eq('author_type', 'client')
        .order('created_at', { ascending: false })

      if (commentsError) {
        console.error('[CRM:TOOL_TRACKING_SUMMARY] Error fetching comments:', commentsError)
        return errorResponse('Erreur lors du chargement des commentaires', 'DATABASE_ERROR', commentsError)
      }

      clientCommentCount = comments?.length ?? 0
      lastCommentAt = comments?.[0]?.created_at ?? null
    }

    const postCount = posts?.length ?? 0
    const lastPostAt = posts?.[0]?.created_at ?? null

    // Dernière activité = la plus récente entre un post et un commentaire.
    let lastActivityAt: string | null = null
    if (lastPostAt && lastCommentAt) {
      lastActivityAt = lastPostAt > lastCommentAt ? lastPostAt : lastCommentAt
    } else {
      lastActivityAt = lastPostAt ?? lastCommentAt
    }

    return successResponse({ postCount, clientCommentCount, lastActivityAt })
  } catch (error) {
    console.error('[CRM:TOOL_TRACKING_SUMMARY] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', error)
  }
}
