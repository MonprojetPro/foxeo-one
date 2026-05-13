'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { LaunchClientParcoursInput } from '../types/parcours.types'

export async function launchClientParcours(
  input: LaunchClientParcoursInput
): Promise<ActionResponse<{ count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = LaunchClientParcoursInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, steps } = parsed.data

    // 1ère étape en 'active' (le client peut démarrer immédiatement),
    // étapes suivantes en 'pending' (verrouillées jusqu'à validation de l'étape précédente).
    const rows = steps.map((step, index) => ({
      client_id: clientId,
      elio_lab_agent_id: step.agentId,
      step_order: index + 1,
      step_label: step.stepLabel,
      status: (index === 0 ? 'active' : 'pending') as 'active' | 'pending',
    }))

    const { error: insertError } = await supabase
      .from('client_parcours_agents')
      .insert(rows)

    if (insertError) {
      console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Insert error:', insertError)
      return errorResponse('Erreur lors du lancement du parcours', 'DB_ERROR', {
        message: insertError.message,
      })
    }

    // Notifier le client que son parcours démarre — kit complet : la cloche client
    // doit s'animer dès le lancement côté Hub (Realtime).
    const { data: clientRow } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', clientId)
      .maybeSingle()

    const clientAuthUserId = (clientRow as { auth_user_id: string | null } | null)?.auth_user_id

    if (clientAuthUserId) {
      await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: clientAuthUserId,
        type: 'parcours',
        title: 'Votre parcours Lab démarre !',
        body: `Découvrez l'étape 1 : ${steps[0].stepLabel}. Élio vous accompagne dès maintenant.`,
        link: '/modules/parcours/steps/1',
      })
    }

    return successResponse({ count: rows.length })
  } catch (error) {
    console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
