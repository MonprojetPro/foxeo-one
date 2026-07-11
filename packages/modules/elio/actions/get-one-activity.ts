'use server'

/**
 * Vue Hub « Activité Élio One » (lot 4) — agrégats RÉELS par client gradué.
 *
 * ⚠️ Le chat Élio One est ÉPHÉMÈRE : aucun message n'est persisté, donc il n'existe
 * NI verbatim NI feedback exploitable pour One. Cette action n'agrège QUE ce qui est
 * réellement mesuré en base :
 *  • escalades  → `notifications` type='elio_escalation' (clientId lu dans `link`)
 *  • évolutions → `validation_requests` type='evolution_one'
 *  • tokens/coût → `elio_token_usage` (client_id, input/output, cost_eur)
 *
 * Réservé opérateur (garde applicative is_operator() + RLS). ActionResponse, jamais throw.
 * La logique d'agrégation vit dans `aggregateOneActivity` (fonction pure testable,
 * types/one-activity.types.ts).
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import {
  aggregateOneActivity,
  type OneActivityRow,
  type GraduatedClientBase,
  type RawEscalation,
  type RawEvolutionRequest,
  type RawTokenRow,
} from '../types/one-activity.types'

export async function getOneActivity(): Promise<ActionResponse<OneActivityRow[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    // ── Garde opérateur ──────────────────────────────────────────────────────
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

    // ── 1. Clients gradués (source de vérité des lignes affichées) ────────────
    // Filtre canonique : client_configs.one_mode_available = true (cf. get-graduated-one-clients).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clientsRaw, error: clientsError } = await (supabase as any)
      .from('clients')
      .select('id, name, client_configs!inner(one_mode_available)')
      .eq('client_configs.one_mode_available', true)
      .order('name', { ascending: true }) as {
        data: Array<{ id: string; name: string | null }> | null
        error: { message: string } | null
      }

    if (clientsError) {
      console.error('[ELIO:ONE_ACTIVITY] Liste clients gradués KO:', clientsError.message)
      return errorResponse('Erreur lors du chargement des clients', 'DATABASE_ERROR', clientsError)
    }

    const graduatedClients: GraduatedClientBase[] = (clientsRaw ?? []).map((c) => ({
      id: c.id,
      name: c.name?.trim() || 'Client sans nom',
    }))

    // Aucun client gradué → rien à agréger (état vide, pas d'invention).
    if (graduatedClients.length === 0) {
      return successResponse<OneActivityRow[]>([])
    }

    // ── 2. Escalades — notifications type='elio_escalation' ───────────────────
    // La table notifications n'a PAS de colonne client_id : le clientId vit dans `link`
    // (/modules/crm/clients/{clientId}?tab=echanges — cf. escalate-to-mikl.ts). On lit
    // donc `link` et on extrait le clientId dans l'agrégation pure.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: escalationsRaw, error: escError } = await (supabase as any)
      .from('notifications')
      .select('link')
      .eq('type', 'elio_escalation') as {
        data: Array<{ link: string | null }> | null
        error: { message: string } | null
      }

    if (escError) {
      console.error('[ELIO:ONE_ACTIVITY] Lecture escalades KO:', escError.message)
      return errorResponse('Erreur lors du chargement des escalades', 'DATABASE_ERROR', escError)
    }
    const escalations: RawEscalation[] = escalationsRaw ?? []

    // ── 3. Demandes d'évolution — validation_requests type='evolution_one' ────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: evolutionsRaw, error: evoError } = await (supabase as any)
      .from('validation_requests')
      .select('client_id')
      .eq('type', 'evolution_one') as {
        data: Array<{ client_id: string | null }> | null
        error: { message: string } | null
      }

    if (evoError) {
      console.error('[ELIO:ONE_ACTIVITY] Lecture demandes évolution KO:', evoError.message)
      return errorResponse('Erreur lors du chargement des demandes', 'DATABASE_ERROR', evoError)
    }
    const evolutionRequests: RawEvolutionRequest[] = evolutionsRaw ?? []

    // ── 4. Consommation tokens — elio_token_usage (tous mois confondus) ───────
    // On restreint aux clients gradués pour éviter de remonter le trafic Hub/Lab.
    const graduatedIds = graduatedClients.map((c) => c.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tokensRaw, error: tokError } = await (supabase as any)
      .from('elio_token_usage')
      .select('client_id, input_tokens, output_tokens, cost_eur')
      .in('client_id', graduatedIds)
      .limit(100_000) as {
        data: Array<{
          client_id: string | null
          input_tokens: number | null
          output_tokens: number | null
          cost_eur: number | null
        }> | null
        error: { message: string } | null
      }

    if (tokError) {
      console.error('[ELIO:ONE_ACTIVITY] Lecture tokens KO:', tokError.message)
      return errorResponse('Erreur lors du chargement de la consommation', 'DATABASE_ERROR', tokError)
    }
    const tokenRows: RawTokenRow[] = tokensRaw ?? []

    // ── 5. Agrégation pure ────────────────────────────────────────────────────
    const rows = aggregateOneActivity(graduatedClients, escalations, evolutionRequests, tokenRows)

    return successResponse<OneActivityRow[]>(rows)
  } catch (err) {
    console.error('[ELIO:ONE_ACTIVITY] Erreur inattendue:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
