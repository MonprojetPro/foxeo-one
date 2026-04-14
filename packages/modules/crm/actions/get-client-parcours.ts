'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { Parcours as ParcoursSchema } from '../types/crm.types'
import type { Parcours } from '../types/crm.types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getClientParcours(clientId: string): Promise<ActionResponse<Parcours | null>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data, error } = await supabase
      .from('parcours')
      .select('*')
      .eq('client_id', clientId)
      .in('status', ['en_cours', 'suspendu', 'abandoned'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[CRM:GET_CLIENT_PARCOURS] Supabase error:', error)
      return errorResponse(
        'Impossible de charger le parcours',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return successResponse(null)
    }

    const parcours = ParcoursSchema.parse({
      id: data.id,
      clientId: data.client_id,
      templateId: data.template_id,
      operatorId: data.operator_id,
      activeStages: data.active_stages,
      status: data.status,
      startedAt: data.started_at,
      suspendedAt: data.suspended_at,
      completedAt: data.completed_at,
      abandonmentReason: data.abandonment_reason ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })

    return successResponse(parcours)
  } catch (error) {
    console.error('[CRM:GET_CLIENT_PARCOURS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
