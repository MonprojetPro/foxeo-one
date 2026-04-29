'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ElioLabAgent } from './sync-elio-lab-agents'

export interface GetElioLabAgentsOptions {
  includeArchived?: boolean
}

/**
 * Server Action — Récupère les agents Élio Lab depuis la DB.
 */
export async function getElioLabAgents(
  options: GetElioLabAgentsOptions = {}
): Promise<ActionResponse<ElioLabAgent[]>> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('elio_lab_agents')
    .select('*')
    .order('sort_order', { ascending: true })

  if (!options.includeArchived) {
    query = query.eq('archived', false)
  }

  const { data, error } = await query

  if (error) {
    return errorResponse('Erreur lors du chargement des agents', 'DB_ERROR', error)
  }

  const agents: ElioLabAgent[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    model: row.model,
    temperature: Number(row.temperature),
    imagePath: row.image_path,
    filePath: row.file_path,
    systemPrompt: row.system_prompt,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return successResponse(agents)
}
