'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { composeStepContextMessage } from '../utils/compose-step-context-message'

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

    const agent = parcoursAgent?.elio_lab_agents ?? null

    // 2. Agent trouvé → charger le contexte non-consommé par client_parcours_agent_id
    if (agent && parcoursAgent) {
      type ContextRow = {
        id: string
        context_message: string
        content_type: string
        file_name: string | null
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: context, error: contextError } = await (supabase as any)
        .from('client_step_contexts')
        .select('id, context_message, content_type, file_name')
        .eq('client_parcours_agent_id', parcoursAgent.id)
        .is('consumed_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle() as { data: ContextRow | null; error: unknown }

      if (contextError) {
        console.error('[ELIO:GET_EFFECTIVE_STEP_CONFIG] Context query error:', contextError)
        // Ne pas continuer silencieusement — signaler l'erreur pour éviter que
        // le contexte injecté par MiKL ne soit jamais annoncé au client
        return errorResponse("Erreur lors de la récupération du contexte de l'étape", 'DB_ERROR', {
          message: String(contextError),
        })
      }

      const announcementMessage = context
        ? composeStepContextMessage({
            contextMessage: context.context_message,
            contentType: context.content_type as 'text' | 'file',
            fileName: context.file_name,
          })
        : null

      return successResponse({
        agentName: agent.name,
        agentImagePath: agent.image_path,
        systemPrompt: agent.system_prompt,
        model: agent.model,
        temperature: Number(agent.temperature),
        announcementMessage,
        contextId: context?.id ?? null,
        source: 'agent' as const,
      })
    }

    // 3. Fallback : config globale client (pas de contexte dans ce cas)
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
      announcementMessage: null,
      contextId: null,
      source: 'global' as const,
    })
  } catch (error) {
    console.error('[ELIO:GET_EFFECTIVE_STEP_CONFIG] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
