'use server'

/**
 * Escalades Élio One récentes (onglet /elio/one — lot 2).
 *
 * Les escalades sont matérialisées comme des lignes `notifications` de
 * `type='elio_escalation'` (cf. escalate-to-mikl.ts), avec `recipient_id` =
 * auth_user_id de l'opérateur. La RLS notifications restreint déjà la lecture aux
 * notifications de l'opérateur ; on ajoute le check applicatif is_operator() par
 * cohérence avec les autres actions Hub (double garde).
 *
 * Vue lecture seule pour MiKL : titre + extrait du corps + date, les plus récentes
 * en premier, limitées.
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

/** Escalade récente exposée au Hub (snake→camel). */
export interface RecentEscalation {
  id: string
  title: string
  body: string
  createdAt: string
}

const DEFAULT_LIMIT = 20

/**
 * Server Action — Liste les dernières escalades Élio One reçues par l'opérateur
 * (20 max par défaut, plus récentes en premier). Retourne { data, error } — jamais throw.
 */
export async function listRecentEscalations(
  limit = DEFAULT_LIMIT,
): Promise<ActionResponse<RecentEscalation[]>> {
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

    const safeLimit = Math.min(Math.max(1, Math.trunc(limit)), 100)

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, created_at')
      .eq('type', 'elio_escalation')
      .order('created_at', { ascending: false })
      .limit(safeLimit)

    if (error) {
      console.error('[ELIO:ESCALATION_LIST] Lecture notifications KO:', error.message)
      return errorResponse('Erreur lors du chargement des escalades', 'DB_ERROR', error)
    }

    const escalations: RecentEscalation[] = ((data ?? []) as Record<string, unknown>[]).map(
      (row) => ({
        id: row.id as string,
        title: (row.title as string | null) ?? '',
        body: (row.body as string | null) ?? '',
        createdAt: row.created_at as string,
      }),
    )

    return successResponse(escalations)
  } catch (err) {
    console.error('[ELIO:ESCALATION_LIST] Unexpected error:', String(err))
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
