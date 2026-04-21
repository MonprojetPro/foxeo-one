'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ElioLabAgent } from './sync-elio-lab-agents'

/**
 * Server Action — Duplique un agent Élio Lab.
 * Crée une copie avec le suffixe " (copie)" dans le nom et un file_path unique.
 */
export async function duplicateElioLabAgent(agentId: string): Promise<ActionResponse<ElioLabAgent>> {
  if (!agentId) {
    return errorResponse('ID agent requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data: original, error: fetchError } = await supabase
    .from('elio_lab_agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (fetchError || !original) {
    return errorResponse('Agent introuvable', 'NOT_FOUND', fetchError)
  }

  // Générer un file_path unique pour la copie (UUID court pour éviter les collisions)
  const basePath = original.file_path.replace(/\.md$/, '')
  const copyFilePath = `${basePath}-copie-${crypto.randomUUID().slice(0, 8)}.md`

  const { data: copy, error: insertError } = await supabase
    .from('elio_lab_agents')
    .insert({
      name: `${original.name} (copie)`,
      description: original.description,
      model: original.model,
      temperature: original.temperature,
      image_path: original.image_path,
      file_path: copyFilePath,
      system_prompt: original.system_prompt,
      archived: false,
    })
    .select()
    .single()

  if (insertError || !copy) {
    return errorResponse('Erreur lors de la duplication', 'DB_ERROR', insertError)
  }

  return successResponse({
    id: copy.id,
    name: copy.name,
    description: copy.description,
    model: copy.model,
    temperature: Number(copy.temperature),
    imagePath: copy.image_path,
    filePath: copy.file_path,
    systemPrompt: copy.system_prompt,
    archived: copy.archived,
    createdAt: copy.created_at,
    updatedAt: copy.updated_at,
  })
}
