'use server'

/**
 * Résolveur de la config pop-up Élio One — RÈGLE UNIQUE côté client.
 *
 * Fusionne, dans cet ordre : DEFAULT ← global (`system_config`) ← surcharge du client
 * (`client_configs.elio_config.one_popup`). Appelé côté CLIENT (layout One, Server Component) :
 * pas de garde opérateur — la RLS laisse le client lire sa propre ligne `client_configs`
 * et la lecture de `system_config` est ouverte. Fallback gracieux à chaque maillon : la
 * pop-up affiche toujours quelque chose, jamais une coquille vide.
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, type ActionResponse } from '@monprojetpro/types'
import { getOnePopupConfig } from './one-popup-config'
import {
  ElioOnePopupOverrideSchema,
  DEFAULT_ONE_POPUP_CONFIG,
  mergeOnePopupConfig,
  type ElioOnePopupConfig,
} from '../types/one-popup.types'

export async function resolveOnePopupConfig(
  clientId?: string,
): Promise<ActionResponse<ElioOnePopupConfig>> {
  // 1. Base globale (déjà tolérante aux pannes — retourne au pire les défauts).
  const { data: global } = await getOnePopupConfig()
  const base = global ?? DEFAULT_ONE_POPUP_CONFIG

  // 2. Sans client identifié → on s'arrête au global.
  if (!clientId?.trim()) {
    return successResponse<ElioOnePopupConfig>(base)
  }

  // 3. Surcharge du client (lecture de SA propre ligne — autorisée par la RLS).
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('client_configs')
      .select('elio_config')
      .eq('client_id', clientId)
      .maybeSingle()

    if (error || !data) {
      return successResponse<ElioOnePopupConfig>(base)
    }

    const elioConfig = (data.elio_config as Record<string, unknown>) ?? {}
    const parsed = ElioOnePopupOverrideSchema.safeParse(elioConfig.one_popup ?? {})
    const override = parsed.success ? parsed.data : null

    return successResponse<ElioOnePopupConfig>(mergeOnePopupConfig(base, override))
  } catch (err) {
    console.warn('[ELIO:ONE_POPUP] Résolution surcharge KO — fallback global:', String(err))
    return successResponse<ElioOnePopupConfig>(base)
  }
}
