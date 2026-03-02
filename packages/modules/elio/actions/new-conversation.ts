'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import { toCamelCase } from '@foxeo/utils'
import type { DashboardType, ElioConversation } from '../types/elio.types'

/**
 * Server Action — Crée une nouvelle conversation Élio.
 * L'ancienne conversation n'est PAS supprimée (AC3).
 * Retourne toujours { data, error } — jamais throw.
 */
export async function newConversation(
  dashboardType: DashboardType
): Promise<ActionResponse<ElioConversation>> {
  const supabase = await createServerSupabaseClient()

  const { data: user, error: authError } = await supabase.auth.getUser()
  if (authError || !user.user) {
    return errorResponse('Utilisateur non authentifié', 'AUTH_ERROR')
  }

  const { data, error } = await supabase
    .from('elio_conversations')
    .insert({
      user_id: user.user.id,
      dashboard_type: dashboardType,
      title: 'Nouvelle conversation',
    })
    .select()
    .single()

  if (error) {
    return errorResponse('Erreur lors de la création de la conversation', 'DB_ERROR', error)
  }

  const conversation = toCamelCase(data) as unknown as ElioConversation
  return successResponse(conversation)
}
