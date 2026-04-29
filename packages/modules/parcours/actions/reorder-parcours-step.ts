'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'

const ReorderParcoursStepInput = z.object({
  stepId: z.string().uuid(),
  clientId: z.string().uuid(),
  direction: z.enum(['up', 'down']),
})

export async function reorderParcoursStep(
  input: z.infer<typeof ReorderParcoursStepInput>
): Promise<ActionResponse<null>> {
  const parsed = ReorderParcoursStepInput.safeParse(input)
  if (!parsed.success) {
    return errorResponse('Données invalides', 'VALIDATION_ERROR')
  }

  const { stepId, clientId, direction } = parsed.data
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  // Récupérer toutes les étapes du client triées par step_order
  const { data: steps, error: fetchError } = await supabase
    .from('client_parcours_agents')
    .select('id, step_order')
    .eq('client_id', clientId)
    .order('step_order', { ascending: true })

  if (fetchError || !steps) {
    return errorResponse('Impossible de récupérer le parcours', 'DB_ERROR')
  }

  const currentIndex = steps.findIndex(s => s.id === stepId)
  if (currentIndex === -1) return errorResponse('Étape introuvable', 'NOT_FOUND')

  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (swapIndex < 0 || swapIndex >= steps.length) {
    return errorResponse('Déplacement impossible', 'OUT_OF_BOUNDS')
  }

  const current = steps[currentIndex]
  const swap = steps[swapIndex]

  // Échanger les step_order entre les deux étapes
  const { error: e1 } = await supabase
    .from('client_parcours_agents')
    .update({ step_order: swap.step_order })
    .eq('id', current.id)

  if (e1) return errorResponse('Erreur lors du réordonnancement', 'DB_ERROR')

  const { error: e2 } = await supabase
    .from('client_parcours_agents')
    .update({ step_order: current.step_order })
    .eq('id', swap.id)

  if (e2) return errorResponse('Erreur lors du réordonnancement', 'DB_ERROR')

  return successResponse(null)
}
