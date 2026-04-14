'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { ActivityLog as ActivityLogSchema } from '../types/crm.types'
import type { ActivityLog } from '../types/crm.types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PAGE_SIZE = 20

const ACTION_DESCRIPTIONS: Record<string, string> = {
  client_created: 'Client créé dans le CRM',
  document_uploaded: 'Document importé',
  client_graduated: 'Graduation vers le dashboard One',
  client_archived: 'Client archivé',
  client_suspended: 'Client suspendu',
  client_reactivated: 'Client réactivé',
  client_closed: 'Client clôturé',
  client_upgraded: 'Type de client mis à jour',
  parcours_assigned: 'Parcours Lab assigné',
  parcours_suspended: 'Parcours suspendu',
  parcours_reactivated: 'Parcours réactivé',
  module_toggled: 'Module activé ou désactivé',
  tier_changed: 'Tier d\'abonnement modifié',
  branding_updated: 'Branding One personnalisé',
  elio_doc_injected: 'Documentation injectée dans Élio',
  documents_synced: 'Documents synchronisés (ZIP)',
  csv_import: 'Import CSV effectué',
  quote_created: 'Devis créé',
  quote_converted: 'Devis converti en facture',
  subscription_created: 'Abonnement créé',
  credit_note_created: 'Avoir créé',
  lab_invoice_sent: 'Facture Lab envoyée',
}

function deriveDescription(action: string, metadata: Record<string, unknown> | null): string {
  if (metadata?.description && typeof metadata.description === 'string') {
    return metadata.description
  }
  return ACTION_DESCRIPTIONS[action] ?? action
}

export async function getActivityLogs(
  clientId: string,
  offset: number = 0
): Promise<ActionResponse<ActivityLog[]>> {
  try {
    if (!clientId || !UUID_REGEX.test(clientId)) {
      return errorResponse('Identifiant client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    // Triple-layer security: verify authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .select(
        `
        id,
        actor_type,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
      `
      )
      .eq('entity_id', clientId)
      .eq('entity_type', 'client')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE)

    if (error) {
      console.error('[CRM:GET_ACTIVITY_LOGS] Supabase error:', error)
      return errorResponse(
        'Impossible de charger l\'historique',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return successResponse([])
    }

    // Transform DB columns to ActivityLog shape
    const logs: ActivityLog[] = data.map((log) =>
      ActivityLogSchema.parse({
        id: log.id,
        clientId: clientId,
        eventType: log.action,
        eventData: (log.metadata as Record<string, unknown>) ?? undefined,
        description: deriveDescription(log.action, log.metadata as Record<string, unknown> | null),
        createdAt: log.created_at,
      })
    )

    return successResponse(logs)
  } catch (error) {
    console.error('[CRM:GET_ACTIVITY_LOGS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
