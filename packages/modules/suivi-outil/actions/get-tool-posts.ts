'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { rowToToolPost } from '../types/tool-post.types'
import type { ToolPost, ToolPostRow } from '../types/tool-post.types'

const BUCKET = 'tool-screenshots'
const SIGNED_URL_EXPIRY = 3600 // 1 heure

export async function getToolPosts(clientId: string): Promise<ActionResponse<ToolPost[]>> {
  if (!clientId) return errorResponse('clientId requis', 'MISSING_CLIENT_ID')

  const supabase = await createServerSupabaseClient()

  // Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) return errorResponse('Non authentifié', 'AUTH_REQUIRED')

  // Vérifier que l'utilisateur est client du bon compte OU opérateur
  const role = user.app_metadata?.role as string | undefined
  if (role !== 'operator') {
    // Client : vérifier qu'il s'agit bien de son propre clientId
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('id', clientId)
      .single()

    if (!clientRecord) {
      return errorResponse('Accès non autorisé à ce client', 'FORBIDDEN')
    }
  }

  // Récupérer les posts
  const { data: rows, error: fetchError } = await supabase
    .from('tool_posts')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (fetchError) {
    return errorResponse('Erreur lors de la récupération des posts', 'FETCH_ERROR', fetchError.message)
  }

  if (!rows || rows.length === 0) return successResponse([])

  // Générer les URLs signées pour chaque post qui a des images
  const posts: ToolPost[] = await Promise.all(
    (rows as ToolPostRow[]).map(async (row) => {
      if (!row.image_paths || row.image_paths.length === 0) {
        return rowToToolPost(row, [])
      }

      const { data: signedUrls } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(row.image_paths, SIGNED_URL_EXPIRY)

      const urls = (signedUrls ?? []).map((s) => s.signedUrl ?? '')

      return rowToToolPost(row, urls)
    })
  )

  return successResponse(posts)
}
