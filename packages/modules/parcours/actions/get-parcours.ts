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
    case 'pending_review': return 'pending_review'
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
      // LOT E — mode de séquençage du parcours (pilote le statut visuel + le bandeau client).
      const { data: cfgRow } = await supabase
        .from('client_configs')
        .select('parcours_mode')
        .eq('client_id', clientId)
        .maybeSingle()
      const parcoursMode: import('../types/parcours.types').ParcoursMode =
        (cfgRow as { parcours_mode?: string } | null)?.parcours_mode === 'libre' ? 'libre' : 'tracee'

      // Récupérer la dernière soumission par étape pour afficher le bon statut dans le panel Élio
      const stepIds = agentSteps.map((s) => s.id)
      const { data: latestSubmissions } = await supabase
        .from('step_submissions')
        .select('parcours_step_id, status, created_at')
        .eq('client_id', clientId)
        .in('parcours_step_id', stepIds)
        .order('created_at', { ascending: false })

      const latestByStep = new Map<string, string>()
      for (const sub of latestSubmissions ?? []) {
        if (!latestByStep.has(sub.parcours_step_id)) {
          latestByStep.set(sub.parcours_step_id, sub.status)
        }
      }

      const steps: ParcoursStep[] = agentSteps.map((row, index) => {
        const latestSubStatus = latestByStep.get(row.id) ?? null
        const baseStatus = mapAgentStatus(row.status as ClientParcoursAgentStatus)

        // Statut visuel dérivé :
        // - current + dernière soumission rejected → carte orange "À corriger"
        // - LOT E mode libre : une étape encore 'locked' (pending) est en réalité disponible
        //   (navigable en parallèle) → on l'affiche comme 'current' pour la rendre engageante.
        // - sinon baseStatus
        let displayStatus: ParcoursStepStatus = baseStatus
        if (parcoursMode === 'libre' && baseStatus === 'locked') {
          displayStatus = 'current'
        }
        if (displayStatus === 'current' && latestSubStatus === 'rejected') {
          displayStatus = 'rejected'
        }

        return {
          id: row.id,
          parcoursId: clientId,
          stepNumber: index + 1,
          title: row.step_label,
          description: (row.elio_lab_agents as { description: string | null } | null)?.description ?? '',
          briefTemplate: null,
          briefContent: null,
          briefAssets: [],
          oneTeasingMessage: null,
          status: displayStatus,
          isEnabled: (row as { is_enabled?: boolean }).is_enabled ?? true,
          completedAt: null,
          validationRequired: false,
          validationId: null,
          latestSubmissionStatus: (latestSubStatus as import('../types/parcours.types').SubmissionStatus) ?? null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      })

      // Les agents désactivés (is_enabled=false) sont EXCLUS du calcul de complétion :
      // ils ne comptent pas et ne bloquent donc pas la graduation.
      const enabledSteps = steps.filter(s => s.isEnabled)
      const completedSteps = enabledSteps.filter(s => s.status === 'completed').length
      const totalSteps = enabledSteps.length
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

      // Dernier « mot d'Élio le Concierge » (LOT F) — message proactif lié au dernier événement.
      // Filtre dashboard_context='lab' : la même table sert désormais aussi le One (Vision v2) ;
      // sans ce filtre, un mot d'Élio One polluerait le bandeau « Mon Parcours » du Lab.
      const { data: lastWord } = await supabase
        .from('client_concierge_messages')
        .select('body, event_type, agent_label, created_at')
        .eq('client_id', clientId)
        .eq('dashboard_context', 'lab')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const conciergeWord = lastWord
        ? {
            body: lastWord.body as string,
            eventType: lastWord.event_type as string,
            agentLabel: (lastWord.agent_label as string | null) ?? null,
            createdAt: lastWord.created_at as string,
          }
        : null

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
        parcoursMode,
        conciergeWord,
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
      // Ancien système (parcours_steps) : toujours séquentiel.
      parcoursMode: 'tracee' as const,
    })
  } catch (error) {
    console.error('[PARCOURS:GET_PARCOURS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
