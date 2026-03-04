'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import type { ActionResponse } from '@foxeo/types'

interface CreateEventInput {
  title: string
  date: string
  description?: string
}

/**
 * Server Action — Crée un événement via le module Agenda.
 * Vérifie que le module est actif, exécute l'action, loggue dans activity_logs.
 * Utilisé par Élio One+ (AC2, FR48 — Story 8.9a).
 *
 * Retourne toujours { data, error } — jamais throw.
 */
export async function createEvent(
  clientId: string,
  input: CreateEventInput,
): Promise<ActionResponse<{ eventId: string }>> {
  if (!input.title?.trim()) {
    return {
      data: null,
      error: { message: 'Le titre de l\'événement est requis', code: 'VALIDATION_ERROR' },
    }
  }

  const supabase = await createServerSupabaseClient()

  // 1. Vérifier module actif (AC3)
  const { data: config } = await supabase
    .from('client_configs')
    .select('active_modules')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!config?.active_modules?.includes('agenda')) {
    return {
      data: null,
      error: {
        message: 'Le module Agenda n\'est pas activé pour ce client',
        code: 'MODULE_NOT_ACTIVE',
      },
    }
  }

  // 2. Créer l'événement — stub : le module agenda sera implémenté plus tard
  // Dans une vraie implémentation, insère en base via le module Agenda
  const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // 3. Logger l'action (AC2 — acteur elio_one_plus)
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'elio_one_plus',
    actor_id: clientId,
    action: 'create_event',
    entity_type: 'agenda',
    metadata: {
      module: 'agenda',
      title: input.title,
      date: input.date,
      description: input.description,
      eventId,
    },
  })

  if (logError) {
    console.error('[ELIO:ACTION] Failed to log create_event:', logError.message)
  }

  return { data: { eventId }, error: null }
}
