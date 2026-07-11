'use server'

/**
 * Config de personnalisation de la pop-up Élio One (pilotage Hub).
 *
 * Deux portées, deux stockages (cf. one-popup.types.ts) :
 *  • GLOBAL — `system_config` clé `elio_one_popup` (pattern alert-thresholds/hub-directives) :
 *    lecture ouverte avec fallback gracieux, écriture réservée opérateur (double garde
 *    is_operator() + RLS).
 *  • SURCHARGE CLIENT — `client_configs.elio_config.one_popup` (JSONB) : lecture/écriture
 *    opérateur, on lit le JSONB existant et on n'y touche QUE la sous-clé `one_popup`
 *    (jamais communication_profile, tier, etc.).
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import {
  ElioOnePopupConfigSchema,
  ElioOnePopupOverrideSchema,
  DEFAULT_ONE_POPUP_CONFIG,
  ELIO_ONE_POPUP_KEY,
  type ElioOnePopupConfig,
  type ElioOnePopupOverride,
} from '../types/one-popup.types'

type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>

/** Garde opérateur — pattern setAlertThresholds (check applicatif is_operator() + RLS). */
async function requireOperator(supabase: Supa): Promise<ActionResponse<never> | null> {
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
  return null
}

// ── Config GLOBALE ──────────────────────────────────────────────────────────

/**
 * Lit la config globale de la pop-up Élio One depuis `system_config`.
 * Fallback gracieux vers DEFAULT_ONE_POPUP_CONFIG (clé absente / invalide / lecture KO) —
 * la pop-up client ne doit jamais tomber pour un hoquet de config.
 */
export async function getOnePopupConfig(): Promise<ActionResponse<ElioOnePopupConfig>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', ELIO_ONE_POPUP_KEY)
      .maybeSingle()

    if (error) {
      console.warn('[ELIO:ONE_POPUP] Lecture system_config KO — fallback défauts:', error.message)
      return successResponse<ElioOnePopupConfig>(DEFAULT_ONE_POPUP_CONFIG)
    }

    if (!data) {
      return successResponse<ElioOnePopupConfig>(DEFAULT_ONE_POPUP_CONFIG)
    }

    const parsed = ElioOnePopupConfigSchema.safeParse(data.value)
    if (!parsed.success) {
      console.warn(
        '[ELIO:ONE_POPUP] Valeur elio_one_popup invalide — fallback défauts:',
        parsed.error.issues[0]?.message ?? 'schéma non conforme',
      )
      return successResponse<ElioOnePopupConfig>(DEFAULT_ONE_POPUP_CONFIG)
    }

    return successResponse<ElioOnePopupConfig>(parsed.data)
  } catch (err) {
    console.warn('[ELIO:ONE_POPUP] Erreur inattendue — fallback défauts:', String(err))
    return successResponse<ElioOnePopupConfig>(DEFAULT_ONE_POPUP_CONFIG)
  }
}

/**
 * Sauvegarde la config globale de la pop-up (opérateur only). Validation Zod stricte.
 */
export async function setOnePopupConfig(
  config: ElioOnePopupConfig,
): Promise<ActionResponse<ElioOnePopupConfig>> {
  const parsed = ElioOnePopupConfigSchema.safeParse(config)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Config pop-up invalide'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  try {
    const supabase = await createServerSupabaseClient()

    const guard = await requireOperator(supabase)
    if (guard) return guard

    const { error } = await supabase
      .from('system_config')
      .upsert({ key: ELIO_ONE_POPUP_KEY, value: parsed.data }, { onConflict: 'key' })

    if (error) {
      console.error('[ELIO:ONE_POPUP] upsert error:', error.message)
      return errorResponse('Erreur lors de la sauvegarde de la config pop-up', 'DATABASE_ERROR', error)
    }

    return successResponse<ElioOnePopupConfig>(parsed.data)
  } catch (err) {
    console.error('[ELIO:ONE_POPUP] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}

// ── SURCHARGE par client ──────────────────────────────────────────────────────

/**
 * Lit la surcharge pop-up d'un client depuis `client_configs.elio_config.one_popup`.
 * Retourne `{}` (aucune surcharge) en fallback gracieux. Réservé opérateur.
 */
export async function getOnePopupClientOverride(
  clientId: string,
): Promise<ActionResponse<ElioOnePopupOverride>> {
  if (!clientId?.trim()) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const guard = await requireOperator(supabase)
    if (guard) return guard

    const { data, error } = await supabase
      .from('client_configs')
      .select('elio_config')
      .eq('client_id', clientId)
      .maybeSingle()

    if (error || !data) {
      if (error) console.warn('[ELIO:ONE_POPUP] Lecture surcharge client KO — fallback {}:', error.message)
      return successResponse<ElioOnePopupOverride>({})
    }

    const elioConfig = (data.elio_config as Record<string, unknown>) ?? {}
    const parsed = ElioOnePopupOverrideSchema.safeParse(elioConfig.one_popup ?? {})
    if (!parsed.success) {
      console.warn('[ELIO:ONE_POPUP] Surcharge client invalide — fallback {}')
      return successResponse<ElioOnePopupOverride>({})
    }

    return successResponse<ElioOnePopupOverride>(parsed.data)
  } catch (err) {
    console.warn('[ELIO:ONE_POPUP] Erreur inattendue (surcharge client) — fallback {}:', String(err))
    return successResponse<ElioOnePopupOverride>({})
  }
}

/**
 * Écrit la surcharge pop-up d'un client dans `client_configs.elio_config.one_popup`
 * (opérateur only). Fusionne dans le JSONB existant sans toucher aux autres sous-clés
 * (communication_profile, tier, parcours_context…). Une surcharge vide (`{}`) supprime
 * la surcharge → le client hérite du global.
 */
export async function setOnePopupClientOverride(
  clientId: string,
  override: ElioOnePopupOverride,
): Promise<ActionResponse<ElioOnePopupOverride>> {
  if (!clientId?.trim()) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const parsed = ElioOnePopupOverrideSchema.safeParse(override)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Surcharge pop-up invalide'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  try {
    const supabase = await createServerSupabaseClient()

    const guard = await requireOperator(supabase)
    if (guard) return guard

    // Lire le JSONB existant pour ne réécrire QUE la sous-clé one_popup.
    const { data: existing, error: readError } = await supabase
      .from('client_configs')
      .select('elio_config')
      .eq('client_id', clientId)
      .maybeSingle()

    if (readError) {
      console.error('[ELIO:ONE_POPUP] Lecture elio_config KO:', readError.message)
      return errorResponse('Erreur de lecture de la config client', 'DATABASE_ERROR', readError)
    }

    const currentConfig = (existing?.elio_config as Record<string, unknown>) ?? {}

    // Surcharge vide → on retire la sous-clé (le client hérite du global).
    const hasOverride = Object.values(parsed.data).some(
      (v) => (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v)),
    )
    const nextConfig: Record<string, unknown> = { ...currentConfig }
    if (hasOverride) {
      nextConfig.one_popup = parsed.data
    } else {
      delete nextConfig.one_popup
    }

    const { error: writeError } = await supabase
      .from('client_configs')
      .update({ elio_config: nextConfig })
      .eq('client_id', clientId)

    if (writeError) {
      console.error('[ELIO:ONE_POPUP] update surcharge client error:', writeError.message)
      return errorResponse('Erreur lors de la sauvegarde de la surcharge', 'DATABASE_ERROR', writeError)
    }

    return successResponse<ElioOnePopupOverride>(hasOverride ? parsed.data : {})
  } catch (err) {
    console.error('[ELIO:ONE_POPUP] Unexpected error (surcharge client):', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
