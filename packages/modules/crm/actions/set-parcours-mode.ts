'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { SetParcoursModeInput as SetParcoursModeInputSchema } from '../types/crm.types'
import type { SetParcoursModeInput, ParcoursMode } from '../types/crm.types'

type SetParcoursModeResult = {
  clientId: string
  mode: ParcoursMode
  /** Nombre d'étapes dont le statut a été resynchronisé par la bascule. */
  resynced: number
}

type AgentRow = {
  id: string
  step_order: number
  status: string
  is_enabled: boolean
}

/**
 * LOT E — Bascule le mode de séquençage d'un parcours (choisie par MiKL depuis le Hub).
 *
 * Écrit `client_configs.parcours_mode` ET resynchronise les statuts de `client_parcours_agents`
 * pour respecter l'invariant du mode cible — la bascule est autorisée À CHAUD (parcours en cours) :
 *
 *   • → 'libre' : toutes les étapes activées encore `pending` (verrouillées) passent `active`.
 *     Les `completed`, `pending_review`, `skipped` sont conservées telles quelles.
 *
 *   • → 'tracee' : on re-verrouille en séquentiel. La 1ʳᵉ étape activée non terminée garde/prend
 *     le focus (`active`, sauf si elle est en `pending_review` — on respecte l'examen en cours) ;
 *     toutes les étapes activées suivantes encore `active` repassent `pending`.
 *
 * Le calcul de complétion (graduation) est inchangé : il compte les agents enabled `completed`.
 */
export async function setParcoursMode(
  input: SetParcoursModeInput
): Promise<ActionResponse<SetParcoursModeResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = SetParcoursModeInputSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse('Données invalides', 'VALIDATION_ERROR', parsed.error.flatten())
    }

    const { clientId, mode } = parsed.data

    // Opérateur (auteur de la bascule, pour le log d'activité)
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // 1) Écrire le flag de mode (broadcast realtime → cockpit Hub + parcours client).
    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ parcours_mode: mode })
      .eq('client_id', clientId)

    if (updateError) {
      console.error('[CRM:SET_PARCOURS_MODE] Update config error:', updateError)
      return errorResponse('Impossible de changer le mode de parcours', 'DATABASE_ERROR', updateError)
    }

    // 2) Resynchroniser les statuts des étapes selon le mode cible.
    let resynced = 0

    if (mode === 'libre') {
      // Toutes les étapes activées encore verrouillées (`pending`) deviennent `active`.
      const { data: unlocked, error: unlockError } = await supabase
        .from('client_parcours_agents')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .eq('is_enabled', true)
        .eq('status', 'pending')
        .select('id')

      if (unlockError) {
        console.error('[CRM:SET_PARCOURS_MODE] Unlock (libre) error:', unlockError)
        return errorResponse('Mode changé mais étapes non resynchronisées', 'DATABASE_ERROR', unlockError)
      }
      resynced = unlocked?.length ?? 0
    } else {
      // 'tracee' — re-verrouillage séquentiel. On a besoin de l'ordre → fetch puis compute.
      const { data: rows, error: fetchError } = await supabase
        .from('client_parcours_agents')
        .select('id, step_order, status, is_enabled')
        .eq('client_id', clientId)
        .order('step_order', { ascending: true })

      if (fetchError) {
        console.error('[CRM:SET_PARCOURS_MODE] Fetch steps error:', fetchError)
        return errorResponse('Mode changé mais étapes non resynchronisées', 'DATABASE_ERROR', fetchError)
      }

      const steps = (rows ?? []) as AgentRow[]
      const toActivate: string[] = []
      const toLock: string[] = []
      let focusFound = false

      for (const step of steps) {
        if (!step.is_enabled) continue // désactivées : exclues, jamais touchées
        if (step.status === 'completed' || step.status === 'skipped') continue

        if (!focusFound) {
          focusFound = true
          // La 1ʳᵉ étape non terminée prend le focus, sauf examen en cours (pending_review).
          if (step.status === 'pending') toActivate.push(step.id)
        } else {
          // Étapes suivantes : on re-verrouille celles ouvertes en parallèle.
          if (step.status === 'active') toLock.push(step.id)
        }
      }

      if (toActivate.length > 0) {
        const { error } = await supabase
          .from('client_parcours_agents')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .in('id', toActivate)
        if (error) {
          console.error('[CRM:SET_PARCOURS_MODE] Activate focus error:', error)
          return errorResponse('Mode changé mais étapes non resynchronisées', 'DATABASE_ERROR', error)
        }
      }

      if (toLock.length > 0) {
        const { error } = await supabase
          .from('client_parcours_agents')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .in('id', toLock)
        if (error) {
          console.error('[CRM:SET_PARCOURS_MODE] Re-lock error:', error)
          return errorResponse('Mode changé mais étapes non resynchronisées', 'DATABASE_ERROR', error)
        }
      }

      resynced = toActivate.length + toLock.length
    }

    // 3) Log d'activité.
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: `parcours_mode_set_${mode}`,
      entity_type: 'client',
      entity_id: clientId,
      metadata: { mode, resynced },
    })

    return successResponse({ clientId, mode, resynced })
  } catch (error) {
    console.error('[CRM:SET_PARCOURS_MODE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
