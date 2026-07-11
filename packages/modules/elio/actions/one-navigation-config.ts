'use server'

/**
 * Config de pilotage de la navigation deep-link Élio One (lot 3 — pilotage Hub).
 *
 * Portée GLOBALE — `system_config` clé `elio_one_navigation` (pattern alert-thresholds) :
 *  • lecture ouverte avec fallback gracieux (getOneNavigationConfig),
 *  • écriture réservée opérateur (double garde is_operator() + RLS) (setOneNavigationConfig).
 *
 * Consommée par send-to-elio (branche One) pour : masquer à Élio les destinations
 * désactivées + injecter la consigne de navigation additionnelle dans le prompt.
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import {
  OneNavigationConfigSchema,
  DEFAULT_ONE_NAVIGATION_CONFIG,
  ELIO_ONE_NAVIGATION_KEY,
  type OneNavigationConfig,
} from '../types/one-navigation-config.types'

/**
 * Lit la config de navigation Élio One depuis `system_config`.
 *
 * Fallback gracieux vers DEFAULT_ONE_NAVIGATION_CONFIG (clé absente / invalide /
 * lecture KO) — le prompt Élio One ne doit jamais tomber pour un hoquet de config.
 * Lecture ouverte (RLS SELECT public sur system_config).
 */
export async function getOneNavigationConfig(): Promise<ActionResponse<OneNavigationConfig>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', ELIO_ONE_NAVIGATION_KEY)
      .maybeSingle()

    if (error) {
      console.warn('[ELIO:ONE_NAV] Lecture system_config KO — fallback défauts:', error.message)
      return successResponse<OneNavigationConfig>(DEFAULT_ONE_NAVIGATION_CONFIG)
    }

    if (!data) {
      return successResponse<OneNavigationConfig>(DEFAULT_ONE_NAVIGATION_CONFIG)
    }

    const parsed = OneNavigationConfigSchema.safeParse(data.value)
    if (!parsed.success) {
      console.warn(
        '[ELIO:ONE_NAV] Valeur elio_one_navigation invalide — fallback défauts:',
        parsed.error.issues[0]?.message ?? 'schéma non conforme',
      )
      return successResponse<OneNavigationConfig>(DEFAULT_ONE_NAVIGATION_CONFIG)
    }

    return successResponse<OneNavigationConfig>(parsed.data)
  } catch (err) {
    console.warn('[ELIO:ONE_NAV] Erreur inattendue — fallback défauts:', String(err))
    return successResponse<OneNavigationConfig>(DEFAULT_ONE_NAVIGATION_CONFIG)
  }
}

/**
 * Sauvegarde la config de navigation Élio One dans `system_config`
 * (opérateur only — double garde is_operator() + RLS). Validation Zod stricte.
 */
export async function setOneNavigationConfig(
  config: OneNavigationConfig,
): Promise<ActionResponse<OneNavigationConfig>> {
  const parsed = OneNavigationConfigSchema.safeParse(config)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Config de navigation invalide'
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
      .upsert({ key: ELIO_ONE_NAVIGATION_KEY, value: parsed.data }, { onConflict: 'key' })

    if (error) {
      console.error('[ELIO:ONE_NAV] upsert error:', error.message)
      return errorResponse('Erreur lors de la sauvegarde de la navigation', 'DATABASE_ERROR', error)
    }

    return successResponse<OneNavigationConfig>(parsed.data)
  } catch (err) {
    console.error('[ELIO:ONE_NAV] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
