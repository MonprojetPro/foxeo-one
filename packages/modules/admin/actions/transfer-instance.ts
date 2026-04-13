'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { TransferInstanceInput, type TransferResult } from '../types/transfer.types'

/**
 * @deprecated Depuis ADR-01 Révision 2 (2026-04-13).
 *
 * Cette fonction reposait sur le modèle "instance per client" qui n'existe plus
 * en exploitation normale. Tous les clients vivent désormais sur le même déploiement
 * multi-tenant `app.monprojet-pro.com`.
 *
 * Le nouveau workflow de remise client au désabonnement est le **Kit de sortie** :
 * voir Story 13.1 dans
 * `_bmad-output/implementation-artifacts/13-1-kit-de-sortie-client-handoff-vercel-github-supabase-standalone.md`
 *
 * Le kit de sortie automatise via un script unique :
 *  1. Provisioning Vercel API (nouveau projet)
 *  2. Création repo GitHub privé
 *  3. Provisioning nouvelle instance Supabase dédiée
 *  4. Export des données client (RLS-filtered) vers la nouvelle DB
 *  5. Push d'un build standalone (Lab + agents tree-shaken via flags `NEXT_PUBLIC_ENABLE_LAB_MODULE=false` + `NEXT_PUBLIC_ENABLE_AGENTS=false`)
 *  6. Connexion Vercel ↔ GitHub + premier déploiement
 *  7. Génération credentials + draft email pour livraison clé en main
 *  8. MiKL transfère la propriété Vercel + GitHub au client (1 clic)
 *
 * Cette fonction reste en place pour ne pas casser les tests existants et pour
 * référence pendant l'implémentation de Story 13.1. Elle sera supprimée
 * complètement après merge de Story 13.1.
 */
export async function transferInstanceToClient(
  input: TransferInstanceInput
): Promise<ActionResponse<TransferResult>> {
  try {
    const parsed = TransferInstanceInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { clientId, recipientEmail } = parsed.data

    // Verify operator exists and owns the client
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur introuvable', 'NOT_FOUND')
    }

    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id, email, client_configs(dashboard_type)')
      .eq('id', clientId)
      .eq('operator_id', operator.id)
      .maybeSingle()

    if (clientError || !clientRecord) {
      return errorResponse(
        "Vous n'êtes pas autorisé à transférer cette instance",
        'UNAUTHORIZED'
      )
    }

    // Verify client is a One client (dashboard_type = 'one')
    const clientConfig = Array.isArray(clientRecord.client_configs)
      ? clientRecord.client_configs[0]
      : clientRecord.client_configs
    if (clientConfig?.dashboard_type !== 'one') {
      return errorResponse(
        'Seuls les clients One peuvent faire l\'objet d\'un transfert d\'instance',
        'INVALID_CLIENT_TYPE'
      )
    }

    // Find the active instance for this client
    const { data: instance, error: instanceError } = await supabase
      .from('client_instances')
      .select('id, status')
      .eq('client_id', clientId)
      .maybeSingle()

    if (instanceError || !instance) {
      return errorResponse("Aucune instance One trouvée pour ce client", 'NOT_FOUND')
    }

    if (instance.status === 'transferred') {
      return errorResponse(
        "L'instance de ce client a déjà été transférée",
        'INSTANCE_ALREADY_TRANSFERRED'
      )
    }

    // Check for existing pending/processing transfer (prevent duplicates)
    const { data: existingTransfer } = await supabase
      .from('instance_transfers')
      .select('id, status')
      .eq('client_id', clientId)
      .in('status', ['pending', 'processing'])
      .maybeSingle()

    if (existingTransfer) {
      return errorResponse(
        'Un transfert est déjà en cours pour ce client',
        'TRANSFER_ALREADY_IN_PROGRESS'
      )
    }

    // Create instance_transfers record
    const { data: transferRecord, error: transferError } = await supabase
      .from('instance_transfers')
      .insert({
        client_id: clientId,
        instance_id: instance.id,
        recipient_email: recipientEmail,
        status: 'pending',
      })
      .select()
      .single()

    if (transferError || !transferRecord) {
      console.error('[ADMIN:TRANSFER_INSTANCE] Insert error:', transferError)
      return errorResponse(
        'Erreur lors de la création du transfert',
        'DATABASE_ERROR',
        transferError
      )
    }

    // Update instance status to 'transferring' (not in CHECK constraint, use 'suspended' interim)
    // Note: 'transferred' is set by Edge Function on completion
    // We keep current status and let Edge Function manage lifecycle

    // Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'instance_transfer_initiated',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        transfer_id: transferRecord.id,
        instance_id: instance.id,
        recipient_email: recipientEmail,
      },
    })

    if (logError) {
      console.error('[ADMIN:TRANSFER_INSTANCE] Activity log error:', logError)
    }

    // Trigger Edge Function asynchronously (fire & forget — process takes 10-30 min)
    const { error: fnError } = await supabase.functions.invoke(
      'transfer-client-instance',
      {
        body: {
          transferId: transferRecord.id,
          clientId,
          instanceId: instance.id,
          recipientEmail,
        },
      }
    )

    if (fnError) {
      console.error('[ADMIN:TRANSFER_INSTANCE] Edge Function invoke error:', fnError)
      // Don't fail — transfer record is created, background job can be retried
    }

    return successResponse({ transferId: transferRecord.id })
  } catch (error) {
    console.error('[ADMIN:TRANSFER_INSTANCE] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
