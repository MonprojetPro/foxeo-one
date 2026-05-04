'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import type {
  ParcoursDB, ParcoursStepDB, ParcoursWithSteps, ParcoursStep, ParcoursStepStatus,
  ClientParcoursAgentStatus,
} from '../types/parcours.types'
import { GetParcoursInput } from '../types/parcours.types'
import { toParcours, toParcoursStep } from '../utils/parcours-mappers'

function mapAgentStatus(status: ClientParcoursAgentStatus): ParcoursStepStatus {
  switch (status) {
    case 'active': return 'current'
    case 'completed': return 'completed'
    case 'skipped': return 'skipped'
    default: return 'locked'
  }
}

export async function getParcours(
  input: { clientId: string }
): Promise<ActionResponse<ParcoursWithSteps>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetParcoursInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId } = parsed.data

    // Priorité 1 : nouveau système Hub — client_parcours_agents + elio_lab_agents
    const { data: agentSteps, error: agentStepsError } = await supabase
      .from('client_parcours_agents')
      .select(`
        *,
        elio_lab_agents (
          id,
          name,
          description,
          image_path
        )
      `)
      .eq('client_id', clientId)
      .order('step_order', { ascending: true })

    if (!agentStepsError && agentSteps && agentSteps.length > 0) {
      const steps: ParcoursStep[] = agentSteps.map((row, index) => ({
        id: row.id,
        parcoursId: clientId,
        stepNumber: index + 1,
        title: row.step_label,
        description: (row.elio_lab_agents as { description: string | null } | null)?.description ?? '',
        briefTemplate: null,
        briefContent: null,
        briefAssets: [],
        oneTeasingMessage: null,
        status: mapAgentStatus(row.status as ClientParcoursAgentStatus),
        completedAt: null,
        validationRequired: false,
        validationId: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))

      const completedSteps = steps.filter(s => s.status === 'completed').length
      const totalSteps = steps.length
      const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
      const allCompleted = completedSteps === totalSteps && totalSteps > 0

      // Récupérer le statut d'abandon de l'ancien système si existant
      const { data: parcoursRow } = await supabase
        .from('parcours')
        .select('status, abandonment_reason')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const isAbandoned = parcoursRow?.status === 'abandoned'
      const parcoursStatus = isAbandoned ? 'abandoned' : (allCompleted ? 'termine' : 'en_cours')

      const result: ParcoursWithSteps = {
        id: clientId,
        clientId,
        templateId: null,
        name: 'Parcours Élio Lab',
        description: null,
        status: parcoursStatus,
        completedAt: null,
        abandonmentReason: parcoursRow?.abandonment_reason ?? null,
        createdAt: agentSteps[0]?.created_at ?? new Date().toISOString(),
        updatedAt: agentSteps[agentSteps.length - 1]?.updated_at ?? new Date().toISOString(),
        steps,
        totalSteps,
        completedSteps,
        progressPercent,
      }

      return successResponse(result)
    }

    // Fallback : ancien système parcours + parcours_steps
    const { data: parcours, error: parcoursError } = await supabase
      .from('parcours')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (parcoursError || !parcours) {
      return errorResponse('Parcours non trouvé', 'NOT_FOUND', parcoursError)
    }

    const { data: steps, error: stepsError } = await supabase
      .from('parcours_steps')
      .select('*')
      .eq('parcours_id', (parcours as ParcoursDB).id)
      .order('step_number', { ascending: true })

    if (stepsError) {
      return errorResponse('Erreur lors de la récupération des étapes', 'DB_ERROR', stepsError)
    }

    const mappedSteps = (steps as ParcoursStepDB[] ?? []).map(toParcoursStep)
    const completedSteps = mappedSteps.filter(s => s.status === 'completed').length
    const totalSteps = mappedSteps.length
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

    return successResponse({
      ...toParcours(parcours as ParcoursDB),
      steps: mappedSteps,
      totalSteps,
      completedSteps,
      progressPercent,
    })
  } catch (error) {
    console.error('[PARCOURS:GET_PARCOURS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
