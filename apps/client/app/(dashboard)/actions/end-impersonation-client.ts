'use server'

import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { IMPERSONATION_COOKIE } from '../../../impersonation-session'

// Story 13.3 (correctif 2026-07-25) — Fermeture RÉELLE de la session.
//
// Avant : cette action tentait un UPDATE que la RLS n'autorisait pas au client
// (aucune policy UPDATE côté client dans 00087) → 0 ligne modifiée, sans erreur, et
// la session restait « active » en base indéfiniment — ce qui bloquait en plus toute
// nouvelle impersonation du même client (check CONFLICT de startImpersonation).
// La policy est ajoutée par la migration
// 20260725140000_impersonation_client_end_session_policy.sql, et on déconnecte
// désormais vraiment le compte client.
export async function endImpersonationClient(
  sessionId: string
): Promise<ActionResponse<{ ended: boolean }>> {
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

    // La session doit être celle du compte actuellement ouvert : on ne clôt jamais
    // la session d'un autre client sur la foi d'un ID passé par le navigateur.
    const { data: updated, error: updateError } = await supabase
      .from('impersonation_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('status', 'active')
      .eq('client_auth_user_id', user.id)
      .select('id')

    if (updateError) {
      console.error('[IMPERSONATION:END_CLIENT] Update error:', updateError)
      return errorResponse('Erreur lors de la fermeture', 'DATABASE_ERROR')
    }

    if (!updated || updated.length === 0) {
      console.warn('[IMPERSONATION:END_CLIENT] Aucune session active à clore:', sessionId)
    }

    // Déconnexion du compte client + suppression du marqueur d'impersonation :
    // effacer le cookie seul laissait l'opérateur connecté comme le client.
    const cookieStore = await cookies()
    cookieStore.delete(IMPERSONATION_COOKIE)
    await supabase.auth.signOut()

    return successResponse({ ended: true })
  } catch (error) {
    console.error('[IMPERSONATION:END_CLIENT] Error:', error)
    return errorResponse(
      'Erreur inattendue',
      'INTERNAL_ERROR',
      { message: error instanceof Error ? error.message : String(error) }
    )
  }
}
