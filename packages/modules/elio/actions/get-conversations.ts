'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { DashboardType, ElioConversation } from '../types/elio.types'

/**
 * Server Action — Récupère les conversations Élio d'un utilisateur.
 * Inclut le dernier message de chaque conversation (AC2 : aperçu 30 char).
 * Triées par dernière activité (updated_at DESC).
 *
 * Pour les clients One (dashboardType='one') :
 * - Inclut les conversations One (actives)
 * - Inclut les conversations Lab en lecture seule (isReadOnly=true) — Story 9.2 AC4
 *
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

  // Pour les clients One, inclure aussi les conversations Lab (lecture seule)
  const dashboardTypes: DashboardType[] = dashboardType === 'one' ? ['one', 'lab'] : [dashboardType]

  const { data, error } = await supabase
    .from('elio_conversations')
    .select('*, elio_messages(content, created_at)')
    .eq('user_id', user.user.id)
    .in('dashboard_type', dashboardTypes)
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

    // Marquer les conversations Lab comme lecture seule pour les clients One
    if (dashboardType === 'one' && row.dashboard_type === 'lab') {
      conv.isReadOnly = true
    }

    return conv
  })

  return successResponse(conversations)
}
