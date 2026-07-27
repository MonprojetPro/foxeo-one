'use server'

import { revalidatePath } from 'next/cache'
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { updateOperatorProfileSchema } from './operator-schemas'

export type OperatorProfileInput = {
  name?: string
  email?: string
}

export type OperatorProfileResult = {
  id: string
  name: string
  email: string
  role: string
  twoFactorEnabled: boolean
  // Après un changement d'email réussi, la session en cours (cookies/JWT) porte
  // encore l'ancienne adresse — elle n'est renouvelée qu'au prochain login. Le
  // formulaire s'appuie sur ce flag pour avertir qu'une reconnexion est nécessaire,
  // plutôt que de laisser croire que le changement est instantané partout.
  requiresReauth: boolean
}

export async function updateOperatorProfile(
  input: OperatorProfileInput
): Promise<ActionResponse<OperatorProfileResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Résolution de l'opérateur par auth_user_id UNIQUEMENT — jamais par email.
    // C'est exactement l'inverse (lookup par email) qui a enfermé MiKL dehors le
    // 2026-07-27 : l'email est une donnée modifiable, stockée à deux endroits
    // (auth.users.email et operators.email) que rien n'oblige à rester
    // synchronisés. auth_user_id est le seul lien stable entre la session et la
    // fiche opérateur (cf. migration 20260727090000_operator_lookup_by_auth_user_id.sql).
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id, name, email, role, two_factor_enabled')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const parsed = updateOperatorProfileSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { name, email } = parsed.data

    if (name === undefined && email === undefined) {
      return errorResponse('Aucune modification à enregistrer', 'VALIDATION_ERROR')
    }

    const emailChanges = email !== undefined && email !== operator.email

    // Sync de l'email de CONNEXION (Supabase Auth) D'ABORD, la fiche `operators`
    // ENSUITE — même séquencement que packages/modules/crm/actions/update-client.ts.
    // Si l'Auth échoue (ex: email déjà pris globalement), on n'a rien désynchronisé :
    // la fiche opérateur garde l'ancien email, cohérent avec l'ancien compte Auth.
    if (emailChanges) {
      const admin = createServiceRoleSupabaseClient()
      const { error: authSyncError } = await admin.auth.admin.updateUserById(user.id, {
        email,
        email_confirm: true,
      })

      if (authSyncError) {
        console.error('[SETTINGS:PROFILE] Auth email sync error:', authSyncError)
        return errorResponse(
          `Impossible de synchroniser l'email de connexion : ${authSyncError.message}`,
          'AUTH_SYNC_ERROR',
          authSyncError
        )
      }
    }

    const dbUpdate: Record<string, unknown> = {}
    if (name !== undefined) dbUpdate.name = name
    if (email !== undefined) dbUpdate.email = email

    const { data: updated, error: updateError } = await supabase
      .from('operators')
      .update(dbUpdate)
      .eq('auth_user_id', user.id)
      .select('id, name, email, role, two_factor_enabled')
      .single()

    if (updateError || !updated) {
      console.error('[SETTINGS:PROFILE] Update error:', updateError)
      return errorResponse(
        'Erreur lors de la mise à jour du profil',
        'DB_ERROR',
        updateError
      )
    }

    revalidatePath('/settings')

    return successResponse({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      twoFactorEnabled: updated.two_factor_enabled,
      requiresReauth: emailChanges,
    })
  } catch (error) {
    console.error('[SETTINGS:PROFILE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
