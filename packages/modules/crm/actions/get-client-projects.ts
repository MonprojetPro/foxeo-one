'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ClientProject, ClientProjectDB } from '../types/crm.types'

// ============================================================
// getClientProjects — T-063, liste les projets (chantiers) d'un client
// ============================================================

export async function getClientProjects(clientId: string): Promise<ActionResponse<ClientProject[]>> {
  try {
    if (!clientId) return errorResponse('Client requis', 'VALIDATION_ERROR')

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data, error } = await supabase
      .from('client_projects')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[CRM:GET_PROJECTS] Select error:', error)
      return errorResponse('Impossible de charger les projets', 'FETCH_FAILED', error)
    }

    const projects = (data ?? []).map((row) =>
      toCamelCase<ClientProjectDB, ClientProject>(row as ClientProjectDB)
    )

    return successResponse(projects)
  } catch (error) {
    console.error('[CRM:GET_PROJECTS] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
