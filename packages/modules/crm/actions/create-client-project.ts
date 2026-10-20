'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ClientProject, ClientProjectDB, CreateClientProjectInput } from '../types/crm.types'
import { CreateClientProjectInput as CreateClientProjectSchema } from '../types/crm.types'

// ============================================================
// createClientProject — T-063
//
// Un client peut avoir plusieurs projets (plusieurs chantiers en parallele) : pas
// de contrainte d'unicite sur le nom, MiKL est seul juge du decoupage.
// ============================================================

export async function createClientProject(
  input: CreateClientProjectInput
): Promise<ActionResponse<ClientProject>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const parsed = CreateClientProjectSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { clientId, name } = parsed.data

    const { data, error } = await supabase
      .from('client_projects')
      .insert({ client_id: clientId, name })
      .select()
      .single()

    if (error || !data) {
      console.error('[CRM:CREATE_PROJECT] Insert error:', error)
      return errorResponse('Impossible de créer le projet', 'CREATE_FAILED', error)
    }

    return successResponse(toCamelCase<ClientProjectDB, ClientProject>(data as ClientProjectDB))
  } catch (error) {
    console.error('[CRM:CREATE_PROJECT] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
