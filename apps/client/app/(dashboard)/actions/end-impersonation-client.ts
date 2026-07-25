'use server'

import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { IMPERSONATION_COOKIE } from '@monprojetpro/utils'

// Story 13.3 (correctif 2026-07-25) — Fermeture RÉELLE de la session.
//
// Historique des deux bugs corrigés ici :
//  1. L'UPDATE direct n'était pas autorisé au client par la RLS (aucune policy UPDATE
//     côté client dans 00087) → 0 ligne modifiée, sans erreur, session éternellement
//     « active » qui bloquait ensuite toute nouvelle impersonation.
//  2. `actions_count` n'était jamais mis à jour sur ce chemin — or c'est le chemin
//     NORMAL (bouton de la bannière). Et le client ne peut pas compter lui-même : il
//     n'a aucun droit de lecture sur activity_logs.
//
// D'où le passage par fn_close_impersonation_session (SECURITY DEFINER), qui clôt et
// recalcule le décompte hors RLS. Suivi d'un signOut réel : effacer le cookie seul
// laissait l'opérateur connecté sous le compte du client.
export async function endImpersonationClient(
  sessionId: string
): Promise<ActionResponse<{ ended: boolean; actionsCount: number }>> {
  try {
    if (!sessionId) {
      return errorResponse('ID de session manquant', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // La fonction vérifie elle-même que l'appelant est bien le compte emprunté
    // (ou un opérateur) : on ne clôt jamais la session d'un autre client sur la foi
    // d'un ID passé par le navigateur.
    const { data, error } = await supabase.rpc('fn_close_impersonation_session', {
      p_session_id: sessionId,
      p_status: 'ended',
    })

    if (error) {
      console.error('[IMPERSONATION:END_CLIENT] RPC error:', error)
      return errorResponse('Erreur lors de la fermeture', 'DATABASE_ERROR')
    }

    const row = Array.isArray(data) ? data[0] : data
    const actionsCount = (row as { actions_count?: number } | null)?.actions_count ?? 0

    if (!(row as { closed?: boolean } | null)?.closed) {
      console.warn('[IMPERSONATION:END_CLIENT] Session introuvable:', sessionId)
    }

    // Déconnexion du compte client + suppression du marqueur d'impersonation.
    const cookieStore = await cookies()
    cookieStore.delete(IMPERSONATION_COOKIE)
    await supabase.auth.signOut()

    return successResponse({ ended: true, actionsCount })
  } catch (error) {
    console.error('[IMPERSONATION:END_CLIENT] Error:', error)
    return errorResponse(
      'Erreur inattendue',
      'INTERNAL_ERROR',
      { message: error instanceof Error ? error.message : String(error) }
    )
  }
}
