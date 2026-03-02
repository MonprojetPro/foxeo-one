'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import { toCamelCase } from '@foxeo/utils'
import type { DashboardType, ElioConversation } from '../types/elio.types'

/**
 * Server Action — Récupère les conversations Élio d'un utilisateur.
 * Inclut le dernier message de chaque conversation (AC2 : aperçu 30 char).
 * Triées par dernière activité (updated_at DESC).
 * Retourne toujours { data, error } — jamais throw.
 */
export async function getConversations(
  dashboardType: DashboardType
): Promise<ActionResponse<ElioConversation[]>> {
  const supabase = await createServerSupabaseClient()

  const { data: user, error: authError } = await supabase.auth.getUser()
  if (authError || !user.user) {
    return errorResponse('Utilisateur non authentifié', 'AUTH_ERROR')
  }

  const { data, error } = await supabase
    .from('elio_conversations')
    .select('*, elio_messages(content, created_at)')
    .eq('user_id', user.user.id)
    .eq('dashboard_type', dashboardType)
    .order('updated_at', { ascending: false })

  if (error) {
    return errorResponse('Erreur lors du chargement des conversations', 'DB_ERROR', error)
  }

  const conversations = (data ?? []).map((row) => {
    // Extraire le dernier message (la relation retourne tous les messages)
    const messages = (row.elio_messages ?? []) as Array<{ content: string; created_at: string }>
    const lastMsg = messages.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { elio_messages: _msgs, ...convRow } = row
    const conv = toCamelCase(convRow) as unknown as ElioConversation
    conv.lastMessagePreview = lastMsg?.content ?? ''
    return conv
  })

  return successResponse(conversations)
}
