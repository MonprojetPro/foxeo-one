'use server'

/**
 * Config d'escalade Élio One → MiKL (pilotage Hub — lot 2), stockée dans
 * `system_config` sous la clé `elio_one_escalation`.
 *
 * Pattern alert-thresholds/one-popup-config :
 *  • lecture ouverte avec fallback gracieux (la pop-up client ne tombe jamais
 *    pour un hoquet de config),
 *  • écriture réservée opérateur (double garde : check applicatif is_operator()
 *    + RLS system_config).
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import {
  EscalationConfigSchema,
  DEFAULT_ESCALATION_CONFIG,
  ELIO_ESCALATION_KEY,
  type EscalationConfig,
} from '../types/escalation-config.types'

/**
 * Lit la config d'escalade Élio One depuis `system_config` (clé `elio_one_escalation`).
 *
 * Fallback gracieux : si la clé est absente, invalide, ou si la lecture échoue,
 * on retourne DEFAULT_ESCALATION_CONFIG — le comportement d'escalade ne doit jamais
 * être bloqué par un hoquet de config (même pattern que getAlertThresholds /
 * getOnePopupConfig). Lecture ouverte (RLS SELECT public sur system_config).
 */
export async function getEscalationConfig(): Promise<ActionResponse<EscalationConfig>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', ELIO_ESCALATION_KEY)
      .maybeSingle()

    if (error) {
      console.warn('[ELIO:ESCALATION] Lecture system_config KO — fallback défauts:', error.message)
      return successResponse<EscalationConfig>(DEFAULT_ESCALATION_CONFIG)
    }

    if (!data) {
      return successResponse<EscalationConfig>(DEFAULT_ESCALATION_CONFIG)
    }

    const parsed = EscalationConfigSchema.safeParse(data.value)
    if (!parsed.success) {
      console.warn(
        '[ELIO:ESCALATION] Valeur elio_one_escalation invalide — fallback défauts:',
        parsed.error.issues[0]?.message ?? 'schéma non conforme',
      )
      return successResponse<EscalationConfig>(DEFAULT_ESCALATION_CONFIG)
    }

    return successResponse<EscalationConfig>(parsed.data)
  } catch (err) {
    console.warn('[ELIO:ESCALATION] Erreur inattendue — fallback défauts:', String(err))
    return successResponse<EscalationConfig>(DEFAULT_ESCALATION_CONFIG)
  }
}

/**
 * Sauvegarde la config d'escalade dans `system_config` (clé `elio_one_escalation`).
 * Réservé aux opérateurs (double garde : check applicatif is_operator() +
 * RLS system_config_insert/update_operator). Validation Zod stricte.
 */
export async function setEscalationConfig(
  config: EscalationConfig,
): Promise<ActionResponse<EscalationConfig>> {
  const parsed = EscalationConfigSchema.safeParse(config)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Config d'escalade invalide"
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
      .upsert({ key: ELIO_ESCALATION_KEY, value: parsed.data }, { onConflict: 'key' })

    if (error) {
      console.error('[ELIO:ESCALATION] upsert error:', error.message)
      return errorResponse("Erreur lors de la sauvegarde de la config d'escalade", 'DATABASE_ERROR', error)
    }

    return successResponse<EscalationConfig>(parsed.data)
  } catch (err) {
    console.error('[ELIO:ESCALATION] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
