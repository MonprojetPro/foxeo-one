'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { updateOperatorPasswordSchema } from './operator-schemas'

export type OperatorPasswordInput = {
  currentPassword: string
  newPassword: string
}

export async function updateOperatorPassword(
  input: OperatorPasswordInput
): Promise<ActionResponse<{ ok: true }>> {
  try {
    const parsed = updateOperatorPasswordSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { currentPassword, newPassword } = parsed.data

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Re-authentification obligatoire AVANT tout changement de mot de passe :
    // sans ce contrôle, quiconque accède à une session déjà ouverte (poste
    // partagé, session volée) pourrait changer le mot de passe sans jamais
    // connaître l'ancien — verrouillant potentiellement le vrai titulaire.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (reauthError) {
      return errorResponse('Mot de passe actuel incorrect', 'INVALID_CURRENT_PASSWORD')
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      console.error('[SETTINGS:PASSWORD] Update error:', updateError)
      return errorResponse(
        'Erreur lors de la mise à jour du mot de passe',
        'AUTH_ERROR',
        updateError
      )
    }

    return successResponse({ ok: true })
  } catch (error) {
    console.error('[SETTINGS:PASSWORD] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
