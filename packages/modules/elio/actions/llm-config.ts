'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import {
  LlmConfigSchema,
  DEFAULT_LLM_CONFIG,
  LLM_CONFIG_KEY,
  type LlmConfig,
} from '../types/llm-config.types'

/**
 * Lit la config LLM depuis system_config (clé `llm_config`).
 *
 * Fallback gracieux : si la clé est absente, invalide, ou si la lecture échoue,
 * on retourne DEFAULT_LLM_CONFIG (défauts Anthropic) — Élio ne doit jamais être
 * bloqué par un hoquet de config. Lecture ouverte (RLS SELECT public sur
 * system_config, comme maintenance_mode).
 */
export async function getLlmConfig(): Promise<ActionResponse<LlmConfig>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', LLM_CONFIG_KEY)
      .maybeSingle()

    if (error) {
      console.warn('[ELIO:LLM_CONFIG] Lecture system_config KO — fallback défauts:', error.message)
      return successResponse<LlmConfig>(DEFAULT_LLM_CONFIG)
    }

    if (!data) {
      return successResponse<LlmConfig>(DEFAULT_LLM_CONFIG)
    }

    const parsed = LlmConfigSchema.safeParse(data.value)
    if (!parsed.success) {
      console.warn(
        '[ELIO:LLM_CONFIG] Valeur llm_config invalide — fallback défauts:',
        parsed.error.issues[0]?.message ?? 'schéma non conforme',
      )
      return successResponse<LlmConfig>(DEFAULT_LLM_CONFIG)
    }

    return successResponse<LlmConfig>(parsed.data)
  } catch (err) {
    console.warn('[ELIO:LLM_CONFIG] Erreur inattendue — fallback défauts:', String(err))
    return successResponse<LlmConfig>(DEFAULT_LLM_CONFIG)
  }
}

/**
 * Sauvegarde la config LLM dans system_config (clé `llm_config`).
 * Réservé aux opérateurs (double garde : check applicatif is_operator() +
 * RLS system_config_insert/update_operator). Validation Zod stricte.
 */
export async function setLlmConfig(config: LlmConfig): Promise<ActionResponse<LlmConfig>> {
  const parsed = LlmConfigSchema.safeParse(config)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Configuration LLM invalide'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: isOperator } = await supabase.rpc('is_operator')
    if (!isOperator) {
      return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')
    }

    const { error } = await supabase
      .from('system_config')
      .upsert({ key: LLM_CONFIG_KEY, value: parsed.data }, { onConflict: 'key' })

    if (error) {
      console.error('[ELIO:LLM_CONFIG] upsert error:', error.message)
      return errorResponse('Erreur lors de la sauvegarde de la config LLM', 'DATABASE_ERROR', error)
    }

    return successResponse<LlmConfig>(parsed.data)
  } catch (err) {
    console.error('[ELIO:LLM_CONFIG] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
