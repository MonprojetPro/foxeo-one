'use server'

import { z } from 'zod'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { assertOperator } from '@monprojetpro/supabase'
import { callGuardVetoAdmin, GuardVetoAdminError } from './admin-client'

/**
 * POST /comptes/action — les DEUX seules choses que le Hub peut faire sur un
 * compte GuardVeto : renvoyer l'invitation, réinitialiser l'accès.
 *
 * 🔑 LA LISTE EST FERMÉE DES DEUX CÔTÉS. Le guichet refuse déjà toute autre
 * action (400), et ce schéma la refuse ici aussi. Ce n'est pas une double
 * ceinture inutile : le jour où quelqu'un ajoutera « supprimer » au guichet
 * pour un autre usage, le Hub ne s'y branchera pas tout seul. Ce que MiKL n'a
 * pas demandé le 11/11 ne doit pas devenir joignable par accident.
 */
const Schema = z.object({
  action: z.enum(['inviter', 'reinitialiser']),
  genre: z.enum(['veterinaire', 'secretaire']),
  id: z.string().uuid('Fiche invalide'),
})

export type CompteActionInput = z.infer<typeof Schema>

export async function actionCompteGuardVeto(
  input: CompteActionInput,
): Promise<ActionResponse<{ envoyeA: string | null }>> {
  const { error: authError } = await assertOperator()
  if (authError) return { data: null, error: authError }

  const parsed = Schema.safeParse(input)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Demande invalide', 'VALIDATION_ERROR')
  }

  try {
    const data = await callGuardVetoAdmin<{ envoyeA: string | null }>('/comptes/action', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    })
    return successResponse(data ?? { envoyeA: null })
  } catch (err) {
    if (err instanceof GuardVetoAdminError) {
      // Le message du guichet est RENDU TEL QUEL : « ce compte est déjà
      // ouvert, utilise Réinitialiser » est exactement ce que MiKL doit lire.
      // Le remplacer par « erreur » le ferait cliquer en boucle.
      return errorResponse(err.message, `GUARDVETO_HTTP_${err.status}`)
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Erreur inconnue lors de l\'appel au guichet GuardVeto',
      'GUARDVETO_UNKNOWN',
    )
  }
}
