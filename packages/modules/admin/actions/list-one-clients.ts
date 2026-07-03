'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

/**
 * Vue « Clients One » — vision v2 (2026-06-24).
 * Le Hub ne pilote plus des « instances » (abandonné) mais des CLIENTS One :
 * offre (② One / ③ One+), cycle de vie de l'outil (chantier → livré), modules actifs.
 */
export interface OneClientEntry {
  clientId: string
  name: string
  company: string | null
  status: string
  /** Mode par défaut au login ('lab' | 'one'). */
  dashboardType: string | null
  /** Le Mode One est débloqué pour ce client. */
  oneModeAvailable: boolean
  /** ② One ou ③ One+ — porté aujourd'hui par elio_tier ('one' | 'one_plus'). */
  offer: 'one' | 'one_plus'
  /** Cycle de vie visuel de l'outil : 'construction' | 'delivered'. */
  oneStatus: 'construction' | 'delivered'
  activeModules: string[]
}

interface ClientConfigRow {
  dashboard_type: string | null
  one_mode_available: boolean | null
  elio_tier: string | null
  one_status: string | null
  active_modules: string[] | null
}

export async function listOneClients(): Promise<ActionResponse<OneClientEntry[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Defense-in-depth: verify operator
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!operator) return errorResponse('Accès réservé aux opérateurs', 'UNAUTHORIZED')

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, company, status, client_configs(dashboard_type, one_mode_available, elio_tier, one_status, active_modules)')
      .eq('operator_id', operator.id)
      .order('name', { ascending: true })

    if (error) {
      console.error('[ADMIN:LIST_ONE_CLIENTS] Error:', error)
      return errorResponse('Erreur lors du chargement des clients One', 'DATABASE_ERROR')
    }

    const entries: OneClientEntry[] = (data ?? [])
      .map((client) => {
        const rawConfig = client.client_configs as ClientConfigRow | ClientConfigRow[] | null
        const config = Array.isArray(rawConfig) ? rawConfig[0] : rawConfig
        if (!config) return null
        // Un client « One » = Mode One débloqué OU One par défaut
        if (!config.one_mode_available && config.dashboard_type !== 'one') return null

        return {
          clientId: client.id,
          name: client.name,
          company: client.company ?? null,
          status: client.status,
          dashboardType: config.dashboard_type ?? null,
          oneModeAvailable: config.one_mode_available ?? false,
          offer: config.elio_tier === 'one_plus' ? 'one_plus' as const : 'one' as const,
          oneStatus: config.one_status === 'delivered' ? 'delivered' as const : 'construction' as const,
          activeModules: config.active_modules ?? [],
        }
      })
      .filter((entry): entry is OneClientEntry => entry !== null)

    return successResponse(entries)
  } catch (error) {
    console.error('[ADMIN:LIST_ONE_CLIENTS] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR')
  }
}
