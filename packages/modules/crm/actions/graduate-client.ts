'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  GraduateClientSchema,
  type GraduateClientInput,
  type GraduationResult,
} from '../types/graduation.types'

/**
 * Graduate a client from Lab to One.
 *
 * ADR-01 Révision 2 (2026-04-13) — Multi-tenant unique :
 * - Pas de provisioning d'instance dédiée (tout vit dans `app.monprojet-pro.com`)
 * - Pas de migration cross-DB (les données Lab restent en place)
 * - Simple bascule de flags sur `client_configs` :
 *   - `dashboard_type: 'lab' → 'one'`
 *   - `lab_mode_available: true` (toggle Mode Lab/One visible dans le shell)
 *   - `elio_lab_enabled: false` (Élio Lab désactivé par défaut, MiKL le réactive au cas par cas)
 *
 * Le client garde l'accès à toutes ses données Lab via le toggle dans le shell.
 */
export async function graduateClient(
  input: GraduateClientInput
): Promise<ActionResponse<GraduationResult>> {
  try {
    // 1. Validate inputs
    const parsed = GraduateClientSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    // 2. Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // 3. Operator lookup
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const operatorId = operator.id
    const { clientId, tier, activeModules, notes } = parsed.data

    // 4. Verify graduation conditions
    const conditionCheck = await checkGraduationConditions(supabase, clientId, operatorId)
    if (conditionCheck.error) return conditionCheck

    // 5. Update clients table — graduation timestamp + notes
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({
        graduated_at: new Date().toISOString(),
        graduation_notes: notes ?? null,
      })
      .eq('id', clientId)
      .eq('operator_id', operatorId)

    if (clientUpdateError) {
      console.error('[CRM:GRADUATE_CLIENT] Client update error:', clientUpdateError)
      return errorResponse(
        'Erreur lors de la graduation — aucune modification effectuée. Réessayez.',
        'GRADUATION_ERROR',
        clientUpdateError
      )
    }

    // 6. Update client_configs — flip dashboard_type + activate toggle + disable Élio Lab
    const elioTier = tier === 'agentique' ? 'one_plus' : 'one'

    const { error: configUpdateError } = await supabase
      .from('client_configs')
      .update({
        dashboard_type: 'one',
        elio_tier: elioTier,
        active_modules: activeModules,
        graduation_source: 'lab',
        // ADR-01 Révision 2 — Toggle Mode Lab/One disponible + Élio Lab off par défaut
        lab_mode_available: true,
        elio_lab_enabled: false,
      })
      .eq('client_id', clientId)

    if (configUpdateError) {
      console.error('[CRM:GRADUATE_CLIENT] Config update error:', configUpdateError)
      // Rollback: revert clients update so the operator can retry cleanly
      await supabase
        .from('clients')
        .update({
          graduated_at: null,
          graduation_notes: null,
        })
        .eq('id', clientId)
      return errorResponse(
        'Erreur lors de la graduation — aucune modification effectuée. Réessayez.',
        'GRADUATION_ERROR',
        configUpdateError
      )
    }

    // 7. Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operatorId,
      action: 'client_graduated',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        tier,
        active_modules: activeModules,
      },
    })

    if (logError) {
      console.error('[CRM:GRADUATE_CLIENT] Activity log error:', logError)
      // Non-blocking — graduation succeeded
    }

    // 8. Revalidate cache
    revalidatePath('/modules/crm')
    revalidatePath(`/modules/crm/clients/${clientId}`)

    return successResponse({
      clientId,
      status: 'graduated' as const,
    })
  } catch (error) {
    console.error('[CRM:GRADUATE_CLIENT] Unexpected error:', error)
    return errorResponse(
      'Erreur lors de la graduation — aucune modification effectuée. Réessayez.',
      'GRADUATION_ERROR',
      error
    )
  }
}

async function checkGraduationConditions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string,
  operatorId: string
): Promise<ActionResponse<null>> {
  // Check client belongs to operator and get config
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('id, operator_id')
    .eq('id', clientId)
    .eq('operator_id', operatorId)
    .single()

  if (clientError || !clientData) {
    return errorResponse('Client introuvable ou accès non autorisé', 'NOT_FOUND')
  }

  // Check not already One (dashboard_type === 'one')
  const { data: config, error: configError } = await supabase
    .from('client_configs')
    .select('dashboard_type')
    .eq('client_id', clientId)
    .single()

  if (configError || !config) {
    return errorResponse('Configuration client introuvable', 'NOT_FOUND')
  }

  if (config.dashboard_type === 'one') {
    return errorResponse(
      'Ce client est déjà en statut One',
      'GRADUATION_CONDITIONS_NOT_MET'
    )
  }

  // Check parcours is completed (status = 'termine')
  const { data: parcours, error: parcoursError } = await supabase
    .from('parcours')
    .select('status, active_stages')
    .eq('client_id', clientId)
    .maybeSingle()

  if (parcoursError) {
    return errorResponse('Erreur lors de la vérification du parcours', 'DATABASE_ERROR')
  }

  if (!parcours || parcours.status !== 'termine') {
    const activeStages = (parcours?.active_stages as Array<{ active: boolean; status: string }>) ?? []
    const remainingSteps = activeStages.filter(
      (s) => s.active && s.status !== 'completed'
    ).length

    return errorResponse(
      `Parcours non terminé${remainingSteps > 0 ? ` — ${remainingSteps} étape(s) restante(s)` : ''}`,
      'GRADUATION_CONDITIONS_NOT_MET'
    )
  }

  // Check no pending validation requests
  const { data: pendingValidations, error: validationError } = await supabase
    .from('validation_requests')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'pending')

  if (validationError) {
    return errorResponse(
      'Erreur lors de la vérification des demandes en attente',
      'DATABASE_ERROR'
    )
  }

  if (pendingValidations && pendingValidations.length > 0) {
    return errorResponse(
      `Demandes de validation en attente — traitez-les d'abord (${pendingValidations.length} en attente)`,
      'GRADUATION_CONDITIONS_NOT_MET'
    )
  }

  return { data: null, error: null }
}
