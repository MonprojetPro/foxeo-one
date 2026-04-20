'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { EffectiveElioConfig, ElioStepConfigDB } from '../types/parcours.types'
import { DEFAULT_ELIO_MODEL, DEFAULT_ELIO_TEMPERATURE, DEFAULT_ELIO_MAX_TOKENS } from '../types/parcours.types'
import { toElioStepConfig } from '../utils/parcours-mappers'

const InputSchema = z.object({
  stepId: z.string().uuid('stepId invalide'),
  clientId: z.string().uuid('clientId invalide'),
})

type GlobalConfigPartial = {
  model: string
  temperature: number
  max_tokens: number
  custom_instructions: string | null
}

/**
 * Retourne la config Élio effective pour une étape.
 * Priorité : elio_step_configs (step-specific) > elio_configs (global client).
 * Utilisé par le chat Élio Lab côté client (Story 14.2).
 */
export async function getEffectiveElioConfig(
  input: { stepId: string; clientId: string }
): Promise<ActionResponse<EffectiveElioConfig>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = InputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR')
    }

    // 1. Chercher une config spécifique à l'étape
    const { data: stepConfig, error: stepError } = await supabase
      .from('elio_step_configs')
      .select('*')
      .eq('step_id', parsed.data.stepId)
      .maybeSingle()

    if (stepError) {
      console.error('[PARCOURS:GET_EFFECTIVE_ELIO_CONFIG] Step config error:', stepError)
      return errorResponse('Erreur lors de la récupération de la configuration étape', 'DB_ERROR', {
        message: stepError.message,
      })
    }

    if (stepConfig) {
      const config = toElioStepConfig(stepConfig as ElioStepConfigDB)
      return successResponse({
        personaName: config.personaName,
        personaDescription: config.personaDescription,
        systemPromptOverride: config.systemPromptOverride,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        customInstructions: config.customInstructions,
        source: 'step' as const,
      })
    }

    // 2. Fallback : config Élio globale du client
    const { data: rawGlobal, error: globalError } = await supabase
      .from('elio_configs')
      .select('model, temperature, max_tokens, custom_instructions')
      .eq('client_id', parsed.data.clientId)
      .maybeSingle()

    const globalConfig = rawGlobal as GlobalConfigPartial | null

    if (globalError) {
      console.error('[PARCOURS:GET_EFFECTIVE_ELIO_CONFIG] Global config error:', globalError)
      return errorResponse('Erreur lors de la récupération de la configuration globale', 'DB_ERROR', {
        message: globalError.message,
      })
    }

    return successResponse({
      personaName: 'Élio',
      personaDescription: null,
      systemPromptOverride: null,
      model: globalConfig?.model ?? DEFAULT_ELIO_MODEL,
      temperature: globalConfig?.temperature ?? DEFAULT_ELIO_TEMPERATURE,
      maxTokens: globalConfig?.max_tokens ?? DEFAULT_ELIO_MAX_TOKENS,
      customInstructions: globalConfig?.custom_instructions ?? null,
      source: 'global' as const,
    })
  } catch (error) {
    console.error('[PARCOURS:GET_EFFECTIVE_ELIO_CONFIG] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
