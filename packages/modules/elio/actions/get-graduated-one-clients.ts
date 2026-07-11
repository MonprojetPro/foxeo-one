'use server'

/**
 * Liste les clients gradués (dashboard One) pour le sélecteur de surcharge pop-up du Hub.
 * Réservé opérateur (RLS clients_select_operator + garde applicative). Trié par nom.
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

export interface GraduatedOneClient {
  id: string
  name: string
}

export async function getGraduatedOneClients(): Promise<ActionResponse<GraduatedOneClient[]>> {
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

    // Jointure interne sur client_configs : ne garder que les clients ayant ACCÈS à One
    // (`one_mode_available = true`) — c'est le flag « gradué » canonique, indépendant de la
    // vue courante (un gradué basculé en vue Lab garde one_mode_available=true).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('clients')
      .select('id, name, client_configs!inner(one_mode_available)')
      .eq('client_configs.one_mode_available', true)
      .order('name', { ascending: true }) as {
        data: Array<{ id: string; name: string | null }> | null
        error: { message: string } | null
      }

    if (error) {
      console.error('[ELIO:ONE_POPUP] Liste clients gradués KO:', error.message)
      return errorResponse('Erreur lors du chargement des clients', 'DATABASE_ERROR', error)
    }

    const clients: GraduatedOneClient[] = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name?.trim() || 'Client sans nom',
    }))

    return successResponse<GraduatedOneClient[]>(clients)
  } catch (err) {
    console.error('[ELIO:ONE_POPUP] Erreur inattendue (liste clients):', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
