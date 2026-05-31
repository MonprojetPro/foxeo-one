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
  agentDescription: string | null
  agentImagePath: string | null
  systemPrompt: string | null
  model: string
  temperature: number
  /**
   * Feuille de route CACHÉE injectée par MiKL pour cette étape (jamais montrée telle quelle
   * au client). Texte brut à injecter dans le system prompt d'Élio pour orienter ses questions.
   */
  steeringInstruction: string | null
  /** Id du contexte le plus récent (pour le marquer consommé après la relance proactive d'Élio). */
  steeringContextId: string | null
  /** true si ce contexte n'a pas encore déclenché la relance proactive d'Élio. */
  steeringPendingKickoff: boolean
  source: 'agent' | 'global'
}

type ParcoursAgentRow = {
  id: string
  elio_lab_agent_id: string
  elio_lab_agents: {
    id: string
    name: string
    description: string | null
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
          description,
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

    // 2. Agent trouvé → charger la feuille de route la PLUS RÉCENTE par client_parcours_agent_id.
    //    On la récupère qu'elle soit consommée ou non : le texte sert de consigne cachée à Élio
    //    pour TOUT le tour de conversation (gating). Le flag consumed_at indique seulement si la
    //    relance proactive d'Élio a déjà eu lieu.
    if (agent && parcoursAgent) {
      type ContextRow = {
        id: string
        context_message: string
        consumed_at: string | null
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: context, error: contextError } = await (supabase as any)
        .from('client_step_contexts')
        .select('id, context_message, consumed_at')
        .eq('client_parcours_agent_id', parcoursAgent.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: ContextRow | null; error: unknown }

      if (contextError) {
        console.error('[ELIO:GET_EFFECTIVE_STEP_CONFIG] Context query error:', contextError)
        // Ne pas continuer silencieusement — signaler l'erreur pour éviter que
        // la feuille de route injectée par MiKL ne soit jamais utilisée par Élio
        return errorResponse("Erreur lors de la récupération du contexte de l'étape", 'DB_ERROR', {
          message: String(contextError),
        })
      }

      return successResponse({
        agentName: agent.name,
        agentDescription: agent.description ?? null,
        agentImagePath: agent.image_path,
        systemPrompt: agent.system_prompt,
        model: agent.model,
        temperature: Number(agent.temperature),
        steeringInstruction: context?.context_message ?? null,
        steeringContextId: context?.id ?? null,
        steeringPendingKickoff: context ? context.consumed_at === null : false,
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
      agentDescription: null,
      agentImagePath: null,
      systemPrompt: null,
      model: globalConfig?.model ?? 'claude-sonnet-4-6',
      temperature: globalConfig?.temperature ?? 1.0,
      steeringInstruction: null,
      steeringContextId: null,
      steeringPendingKickoff: false,
      source: 'global' as const,
    })
  } catch (error) {
    console.error('[ELIO:GET_EFFECTIVE_STEP_CONFIG] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
