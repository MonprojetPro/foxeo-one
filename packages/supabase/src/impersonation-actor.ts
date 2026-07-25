import { cookies } from 'next/headers'
import {
  IMPERSONATION_COOKIE,
  resolveActivityActor,
  resolveImpersonation,
  type ActivityActor,
} from '@monprojetpro/utils'

// Story 13.3 (correctif 2026-07-25) — Attribution correcte des actions journalisées.
//
// Le middleware de l'app client journalise TOUTE mutation faite en impersonation (socle
// exhaustif). Ce helper sert aux Server Actions qui écrivent DÉJÀ un log métier : sans
// lui, elles l'attribuent au client (`actor_type: 'client'`) alors que c'est l'opérateur
// qui a agi — l'historique support devient alors indistinguable d'une action du client.
//
// Le cookie est httpOnly et posé par /auth/impersonation : il n'est pas falsifiable
// depuis le navigateur.
export async function resolveLogActor(fallback: {
  actor_type: 'client' | 'operator'
  actor_id: string
}): Promise<ActivityActor> {
  try {
    const cookieStore = await cookies()
    const impersonation = resolveImpersonation(cookieStore.get(IMPERSONATION_COOKIE)?.value)
    return resolveActivityActor(impersonation, fallback)
  } catch {
    // Contexte sans cookies (tests, appels hors requête) → acteur nominal.
    return resolveActivityActor(null, fallback)
  }
}
