'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

const InputSchema = z.object({
  stepId: z.string().uuid('stepId invalide'),
  stepNumber: z.number().int().min(1, 'stepNumber doit être >= 1'),
  clientId: z.string().uuid('clientId invalide'),
})

export interface EffectiveStepConfig {
  agentName: string
  agentImagePath: string | null
  systemPrompt: string | null
  model: string
  temperature: number
  announcementMessage: string | null
  contextId: string | null
  source: 'agent' | 'global'
}

type ParcoursAgentRow = {
  id: string
  elio_lab_agent_id: string
  elio_lab_agents: {
    id: string
    name: string
    model: string
    temperature: number
    image_path: string | null
    system_prompt: string | null
  } | null
} | null

/**
 * Server Action — Résout la config Élio complète pour une étape de parcours.
 *
 * Priorité :
 * 1. client_parcours_agents (agent assigné) → elio_lab_agents (config complète)
 * 2. Fallback : elio_configs (config globale client)
 *
 * Récupère également le premier contexte non-consommé injecté par MiKL
 * (client_step_contexts WHERE consumed_at IS NULL).
 */
export async function getEffectiveStepConfig(
  input: { stepId: string; stepNumber: number; clientId: string }
): Promise<ActionResponse<EffectiveStepConfig>> {
  try {
    const parsed = InputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR')
    }

    const { stepId, stepNumber, clientId } = parsed.data
    const supabase = await createServerSupabaseClient()

    // 1. Chercher l'agent assigné à cette étape (step_order = stepNumber)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: parcoursAgent, error: agentError } = await (supabase as any)
      .from('client_parcours_agents')
      .select(`
        id,
        elio_lab_agent_id,
        elio_lab_agents (
          id,
          name,
          model,
          temperature,
          image_path,
          system_prompt
        )
      `)
      .eq('client_id', clientId)
      .eq('step_order', stepNumber)
      .maybeSingle() as { data: ParcoursAgentRow; error: unknown }

    if (agentError) {
      console.error('[ELIO:GET_EFFECTIVE_STEP_CONFIG] Agent query error:', agentError)
      return errorResponse("Erreur lors de la résolution de l'agent", 'DB_ERROR', {
        message: String(agentError),
      })
    }

    // 2. Chercher le premier contexte non-consommé pour cette étape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: context, error: contextError } = await (supabase as any)
      .from('client_step_contexts')
      .select('id, context_message')
      .eq('client_id', clientId)
      .eq('step_id', stepId)
      .is('consumed_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle() as { data: { id: string; context_message: string } | null; error: unknown }

    if (contextError) {
      // Non-bloquant : on continue sans contexte, mais on log pour détecter les anomalies
      console.error('[ELIO:GET_EFFECTIVE_STEP_CONFIG] Context query error:', contextError)
    }

    const agent = parcoursAgent?.elio_lab_agents ?? null

    // 3. Agent trouvé → utiliser sa config
    if (agent) {
      return successResponse({
        agentName: agent.name,
        agentImagePath: agent.image_path,
        systemPrompt: agent.system_prompt,
        model: agent.model,
        temperature: Number(agent.temperature),
        announcementMessage: context?.context_message ?? null,
        contextId: context?.id ?? null,
        source: 'agent' as const,
      })
    }

    // 4. Fallback : config globale client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: globalConfig } = await (supabase as any)
      .from('elio_configs')
      .select('model, temperature')
      .eq('client_id', clientId)
      .maybeSingle() as { data: { model: string; temperature: number } | null }

    return successResponse({
      agentName: 'Élio',
      agentImagePath: null,
      systemPrompt: null,
      model: globalConfig?.model ?? 'claude-sonnet-4-6',
      temperature: globalConfig?.temperature ?? 1.0,
      announcementMessage: context?.context_message ?? null,
      contextId: context?.id ?? null,
      source: 'global' as const,
    })
  } catch (error) {
    console.error('[ELIO:GET_EFFECTIVE_STEP_CONFIG] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
