'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ClientParcoursAgentDB, ElioLabAgentDB, ClientParcoursAgentWithDetails } from '../types/parcours.types'
import { GetClientParcoursAgentsInput } from '../types/parcours.types'

export async function getClientParcoursAgents(
  input: GetClientParcoursAgentsInput
): Promise<ActionResponse<ClientParcoursAgentWithDetails[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetClientParcoursAgentsInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data, error } = await supabase
      .from('client_parcours_agents')
      .select(`
        *,
        elio_lab_agents (
          id,
          name,
          description,
          image_path
        )
      `)
      .eq('client_id', parsed.data.clientId)
      .order('step_order', { ascending: true })

    if (error) {
      console.error('[PARCOURS:GET_CLIENT_PARCOURS_AGENTS] DB error:', error)
      return errorResponse('Erreur lors de la récupération du parcours', 'DB_ERROR', {
        message: error.message,
      })
    }

    const rows = (data ?? []) as (ClientParcoursAgentDB & { elio_lab_agents: Pick<ElioLabAgentDB, 'id' | 'name' | 'description' | 'image_path'> | null })[]

    const result: ClientParcoursAgentWithDetails[] = rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      elioLabAgentId: row.elio_lab_agent_id,
      stepOrder: row.step_order,
      stepLabel: row.step_label,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      agentName: row.elio_lab_agents?.name ?? '(agent supprimé)',
      agentDescription: row.elio_lab_agents?.description ?? null,
      agentImagePath: row.elio_lab_agents?.image_path ?? null,
    }))

    return successResponse(result)
  } catch (error) {
    console.error('[PARCOURS:GET_CLIENT_PARCOURS_AGENTS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
