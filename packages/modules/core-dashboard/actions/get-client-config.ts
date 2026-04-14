'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  type ClientConfig,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

/**
 * Server Action — Fetche la configuration client depuis client_configs.
 * Retourne { data: ClientConfig, error } — jamais throw.
 */
export async function getClientConfig(
  clientId: string
): Promise<ActionResponse<ClientConfig>> {
  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('client_configs')
    .select(
      'id, client_id, dashboard_type, active_modules, theme_variant, custom_branding, elio_config, elio_tier, density, created_at, updated_at'
    )
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) {
    console.error('[CORE-DASHBOARD:GET-CLIENT-CONFIG] DB error:', error)
    return errorResponse('Erreur lors du chargement de la configuration', 'DB_ERROR', error)
  }

  if (!data) {
    return errorResponse('Configuration client introuvable', 'NOT_FOUND')
  }

  const config: ClientConfig = {
    id: data.id,
    clientId: data.client_id,
    dashboardType: data.dashboard_type as ClientConfig['dashboardType'],
    activeModules: data.active_modules ?? ['core-dashboard'],
    themeVariant: (data.theme_variant ?? 'one') as ClientConfig['themeVariant'],
    customBranding: (data.custom_branding as ClientConfig['customBranding']) ?? undefined,
    elioConfig: (data.elio_config as ClientConfig['elioConfig']) ?? undefined,
    elioTier: (data.elio_tier as ClientConfig['elioTier']) ?? undefined,
    density: (data.density ?? 'comfortable') as ClientConfig['density'],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return successResponse(config)
}
