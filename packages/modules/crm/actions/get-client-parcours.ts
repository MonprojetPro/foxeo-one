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

    // Lire client_parcours_agents pour un décompte réel des étapes
    const { data: agents } = await supabase
      .from('client_parcours_agents')
      .select('id, step_order, step_label, status')
      .eq('client_id', clientId)
      .order('step_order', { ascending: true })

    const derivedStages = (agents ?? []).map((a) => ({
      key: a.id as string,
      label: (a.step_label as string | null) ?? null,
      active: (a.status as string) !== 'skipped',
      status: (
        a.status === 'active' || a.status === 'pending_review' ? 'in_progress'
        : a.status === 'completed' ? 'completed'
        : a.status === 'skipped' ? 'skipped'
        : 'pending'
      ) as 'pending' | 'in_progress' | 'completed' | 'skipped',
    }))

    const activeStages = derivedStages.length > 0 ? derivedStages : (data.active_stages ?? [])

    const parcours = ParcoursSchema.parse({
      id: data.id,
      clientId: data.client_id,
      templateId: data.template_id,
      operatorId: data.operator_id,
      activeStages,
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
