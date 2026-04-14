'use server'

// Story 12.7 — Task 5: Server Action upgrade instance
// Enregistre l'intention d'upgrade (implémentation manuelle Supabase/Vercel)

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, errorResponse, successResponse } from '@monprojetpro/types'
import { z } from 'zod'

const UpgradeSchema = z.object({
  instanceId: z.string().uuid(),
  plan: z.enum(['supabase_pro', 'vercel_pro', 'both']),
  notes: z.string().optional(),
})

export type UpgradePlan = z.infer<typeof UpgradeSchema>['plan']

const PLAN_LABELS: Record<UpgradePlan, string> = {
  supabase_pro: 'Supabase Pro (+25$/mois)',
  vercel_pro: 'Vercel Pro (+20$/mois)',
  both: 'Supabase Pro + Vercel Pro (+45$/mois)',
}

export async function upgradeInstance(
  input: z.infer<typeof UpgradeSchema>
): Promise<ActionResponse<{ instanceId: string; plan: UpgradePlan }>> {
  const parsed = UpgradeSchema.safeParse(input)
  if (!parsed.success) {
    return errorResponse('Données invalides', 'VALIDATION_ERROR', parsed.error.format())
  }

  const { instanceId, plan, notes } = parsed.data
  const supabase = await createServerSupabaseClient()

  // Auth check — opérateur requis
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }
  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) {
    return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')
  }

  // Vérifier que l'instance existe
  const { data: instance, error: fetchError } = await supabase
    .from('client_instances')
    .select('id, slug, metadata')
    .eq('id', instanceId)
    .maybeSingle()

  if (fetchError || !instance) {
    return errorResponse('Instance introuvable', 'NOT_FOUND')
  }

  // Enregistrer l'intention d'upgrade dans metadata
  const metadata = (instance.metadata as Record<string, unknown> | null) ?? {}
  const upgradeRequest = {
    plan,
    planLabel: PLAN_LABELS[plan],
    requestedAt: new Date().toISOString(),
    notes: notes ?? null,
    status: 'pending',
  }

  const { error: updateError } = await supabase
    .from('client_instances')
    .update({
      metadata: {
        ...metadata,
        upgrade_request: upgradeRequest,
      },
    })
    .eq('id', instanceId)

  if (updateError) {
    console.error('[ADMIN:UPGRADE_INSTANCE] Update error:', updateError)
    return errorResponse('Erreur lors de l\'enregistrement de l\'upgrade', 'DB_ERROR')
  }

  return successResponse({ instanceId, plan })
}
