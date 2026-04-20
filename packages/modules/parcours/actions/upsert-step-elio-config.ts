'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type { ElioStepConfig, ElioStepConfigDB } from '../types/parcours.types'
import { UpsertElioStepConfigInput } from '../types/parcours.types'
import { toElioStepConfig } from '../utils/parcours-mappers'

export async function upsertStepElioConfig(
  input: UpsertElioStepConfigInput
): Promise<ActionResponse<ElioStepConfig>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = UpsertElioStepConfigInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { stepId, personaName, personaDescription, systemPromptOverride, model, temperature, maxTokens, customInstructions } = parsed.data

    const { data, error } = await supabase
      .from('elio_step_configs')
      .upsert(
        {
          step_id: stepId,
          persona_name: personaName,
          persona_description: personaDescription ?? null,
          system_prompt_override: systemPromptOverride ?? null,
          model,
          temperature,
          max_tokens: maxTokens,
          custom_instructions: customInstructions ?? null,
        },
        { onConflict: 'step_id' }
      )
      .select()
      .single()

    if (error || !data) {
      console.error('[PARCOURS:UPSERT_STEP_ELIO_CONFIG] DB error:', error)
      return errorResponse('Impossible de sauvegarder la configuration', 'DB_ERROR', {
        message: error?.message ?? 'Aucune donnée retournée',
      })
    }

    return successResponse(toElioStepConfig(data as ElioStepConfigDB))
  } catch (error) {
    console.error('[PARCOURS:UPSERT_STEP_ELIO_CONFIG] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
