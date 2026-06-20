'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Seuil d'inactivité aligné sur le moteur de relance LOT F (find_inactive_parcours_clients).
// Local (non exporté) : un fichier 'use server' ne peut exporter que des fonctions async.
const INACTIVITY_THRESHOLD_DAYS = 7

export type ClientActivitySnapshot = {
  /** Première connexion du client (clients.first_login_at). Null = jamais connecté. */
  firstLoginAt: string | null
  /** Dernier mouvement du client (max agent updated_at / dernière soumission). Null = aucune activité. */
  lastActivityAt: string | null
  /** Jours écoulés depuis la dernière activité. Null si jamais d'activité. */
  daysSinceActivity: number | null
  /** True si inactif au-delà du seuil (cohérent avec les relances Concierge). */
  isInactive: boolean
}

/**
 * Photo d'activité d'un client pour le cockpit Hub (bloc « Activité & alertes »).
 * Source du « dernier mouvement » : client_parcours_agents.updated_at — le même signal
 * que le moteur d'inactivité LOT F — complété par la dernière soumission pour robustesse.
 */
export async function getClientActivitySnapshot(
  clientId: string
): Promise<ActionResponse<ClientActivitySnapshot>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // 1) Première connexion
    const { data: clientRow } = await supabase
      .from('clients')
      .select('first_login_at')
      .eq('id', clientId)
      .maybeSingle()

    // 2) Dernier mouvement d'un agent du parcours (signal canonique d'activité)
    const { data: lastAgent } = await supabase
      .from('client_parcours_agents')
      .select('updated_at')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 3) Dernière soumission (complète le signal d'activité)
    const { data: lastSub } = await supabase
      .from('step_submissions')
      .select('created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const firstLoginAt = (clientRow?.first_login_at as string | null) ?? null

    const candidates = [
      lastAgent?.updated_at as string | undefined,
      lastSub?.created_at as string | undefined,
    ].filter((v): v is string => Boolean(v))

    const lastActivityAt =
      candidates.length > 0
        ? candidates.reduce((a, b) => (new Date(a).getTime() > new Date(b).getTime() ? a : b))
        : null

    let daysSinceActivity: number | null = null
    if (lastActivityAt) {
      const elapsedMs = Date.now() - new Date(lastActivityAt).getTime()
      daysSinceActivity = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)))
    }

    const isInactive = daysSinceActivity !== null && daysSinceActivity > INACTIVITY_THRESHOLD_DAYS

    return successResponse({ firstLoginAt, lastActivityAt, daysSinceActivity, isInactive })
  } catch (error) {
    console.error('[CRM:GET_CLIENT_ACTIVITY_SNAPSHOT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
