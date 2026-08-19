'use server'

/**
 * Config de la prise de nouvelles proactive d'Élio One, stockée dans `system_config`
 * sous la clé `elio_one_checkin`.
 *
 * Même pattern qu'escalation-config :
 *  • lecture ouverte avec fallback gracieux (jamais bloquante),
 *  • écriture réservée opérateur (double garde : is_operator() + RLS system_config).
 *
 * ⚠️ L'Edge Function `one-project-checkin` lit la MÊME clé, en snake_case. La conversion
 * se fait via toCheckinConfig / toCheckinConfigRow — ne jamais écrire du camelCase brut
 * dans `system_config`, le cron ne le relirait pas et retomberait sur ses défauts.
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import {
  CheckinConfigSchema,
  DEFAULT_CHECKIN_CONFIG,
  ELIO_CHECKIN_KEY,
  toCheckinConfig,
  toCheckinConfigRow,
  type CheckinConfig,
} from '../types/checkin-config.types'

/** Lit la config de prise de nouvelles. Fallback défauts si absente/invalide/illisible. */
export async function getCheckinConfig(): Promise<ActionResponse<CheckinConfig>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', ELIO_CHECKIN_KEY)
      .maybeSingle()

    if (error) {
      console.warn('[ELIO:CHECKIN] Lecture system_config KO — fallback défauts:', error.message)
      return successResponse<CheckinConfig>(DEFAULT_CHECKIN_CONFIG)
    }

    if (!data) {
      return successResponse<CheckinConfig>(DEFAULT_CHECKIN_CONFIG)
    }

    const config = toCheckinConfig(data.value)
    if (!config) {
      console.warn('[ELIO:CHECKIN] Valeur elio_one_checkin invalide — fallback défauts')
      return successResponse<CheckinConfig>(DEFAULT_CHECKIN_CONFIG)
    }

    return successResponse<CheckinConfig>(config)
  } catch (err) {
    console.warn('[ELIO:CHECKIN] Erreur inattendue — fallback défauts:', String(err))
    return successResponse<CheckinConfig>(DEFAULT_CHECKIN_CONFIG)
  }
}

/** Sauvegarde la config. Réservé aux opérateurs. Validation Zod stricte. */
export async function setCheckinConfig(
  config: CheckinConfig,
): Promise<ActionResponse<CheckinConfig>> {
  const parsed = CheckinConfigSchema.safeParse(config)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Config de prise de nouvelles invalide'
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
      .upsert(
        { key: ELIO_CHECKIN_KEY, value: toCheckinConfigRow(parsed.data) },
        { onConflict: 'key' },
      )

    if (error) {
      console.error('[ELIO:CHECKIN] upsert error:', error.message)
      return errorResponse(
        'Erreur lors de la sauvegarde de la prise de nouvelles',
        'DATABASE_ERROR',
        error,
      )
    }

    return successResponse<CheckinConfig>(parsed.data)
  } catch (err) {
    console.error('[ELIO:CHECKIN] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
