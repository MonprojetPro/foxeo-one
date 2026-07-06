'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import {
  AlertThresholdsSchema,
  DEFAULT_ALERT_THRESHOLDS,
  ALERT_THRESHOLDS_KEY,
  type AlertThresholds,
} from '../types/alert-thresholds.types'

/**
 * Lit les seuils d'alertes Élio depuis system_config (clé `elio_alert_thresholds`).
 *
 * Fallback gracieux : si la clé est absente, invalide, ou si la lecture échoue,
 * on retourne DEFAULT_ALERT_THRESHOLDS — les suggestions de l'accueil Hub ne
 * doivent jamais être bloquées par un hoquet de config (même pattern que
 * getLlmConfig). Lecture ouverte (RLS SELECT public sur system_config).
 */
export async function getAlertThresholds(): Promise<ActionResponse<AlertThresholds>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', ALERT_THRESHOLDS_KEY)
      .maybeSingle()

    if (error) {
      console.warn('[ELIO:ALERT_THRESHOLDS] Lecture system_config KO — fallback défauts:', error.message)
      return successResponse<AlertThresholds>(DEFAULT_ALERT_THRESHOLDS)
    }

    if (!data) {
      return successResponse<AlertThresholds>(DEFAULT_ALERT_THRESHOLDS)
    }

    const parsed = AlertThresholdsSchema.safeParse(data.value)
    if (!parsed.success) {
      console.warn(
        '[ELIO:ALERT_THRESHOLDS] Valeur elio_alert_thresholds invalide — fallback défauts:',
        parsed.error.issues[0]?.message ?? 'schéma non conforme',
      )
      return successResponse<AlertThresholds>(DEFAULT_ALERT_THRESHOLDS)
    }

    return successResponse<AlertThresholds>(parsed.data)
  } catch (err) {
    console.warn('[ELIO:ALERT_THRESHOLDS] Erreur inattendue — fallback défauts:', String(err))
    return successResponse<AlertThresholds>(DEFAULT_ALERT_THRESHOLDS)
  }
}

/**
 * Sauvegarde les seuils d'alertes dans system_config (clé `elio_alert_thresholds`).
 * Réservé aux opérateurs (double garde : check applicatif is_operator() +
 * RLS system_config_insert/update_operator). Validation Zod stricte.
 */
export async function setAlertThresholds(
  thresholds: AlertThresholds,
): Promise<ActionResponse<AlertThresholds>> {
  const parsed = AlertThresholdsSchema.safeParse(thresholds)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Seuils d’alertes invalides'
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
      .upsert({ key: ALERT_THRESHOLDS_KEY, value: parsed.data }, { onConflict: 'key' })

    if (error) {
      console.error('[ELIO:ALERT_THRESHOLDS] upsert error:', error.message)
      return errorResponse('Erreur lors de la sauvegarde des seuils', 'DATABASE_ERROR', error)
    }

    return successResponse<AlertThresholds>(parsed.data)
  } catch (err) {
    console.error('[ELIO:ALERT_THRESHOLDS] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
