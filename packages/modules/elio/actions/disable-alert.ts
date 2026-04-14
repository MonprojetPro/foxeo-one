'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import type { ElioAlertsPreferences } from '../types/elio.types'
import { DEFAULT_ELIO_ALERTS_PREFERENCES } from '../config/default-alerts'

/**
 * Story 8.9c — Task 8
 * Server Action — Désactive une règle d'alerte proactive.
 *
 * Détecte la règle par correspondance souple sur le message (includes toLowerCase).
 * Marque la règle `enabled: false` dans client_configs.elio_alerts_preferences.
 *
 * AC4 : "Arrête de me rappeler pour les feuilles d'émargement" → disable 'missing_attendance_sheets'
 */
export async function disableAlert(
  clientId: string,
  alertSubject: string
): Promise<ActionResponse<boolean>> {
  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  if (!alertSubject.trim()) {
    return errorResponse('alertSubject requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Task 8.1 — Charger les prefs
  const { data: config, error: fetchError } = await supabase
    .from('client_configs')
    .select('elio_alerts_preferences')
    .eq('client_id', clientId)
    .single()

  if (fetchError || !config) {
    return errorResponse('Config client non trouvée', 'NOT_FOUND', fetchError)
  }

  const rawPrefs = config.elio_alerts_preferences as ElioAlertsPreferences | null
  const prefs: ElioAlertsPreferences = rawPrefs ?? {
    ...DEFAULT_ELIO_ALERTS_PREFERENCES,
    alerts: DEFAULT_ELIO_ALERTS_PREFERENCES.alerts.map((a) => ({ ...a })),
  }

  // Task 8.2 — Identifier la règle correspondante (correspondance souple)
  const subject = alertSubject.toLowerCase()
  const matchedAlert = prefs.alerts.find((a) =>
    a.message.toLowerCase().includes(subject) ||
    a.id.toLowerCase().includes(subject) ||
    a.moduleId.toLowerCase().includes(subject)
  )

  if (!matchedAlert) {
    return errorResponse(`Aucune alerte trouvée pour le sujet : "${alertSubject}"`, 'NOT_FOUND')
  }

  // Task 8.4 — Marquer enabled: false
  matchedAlert.enabled = false

  // Task 8.5 — Sauvegarder
  const { error: updateError } = await supabase
    .from('client_configs')
    .update({ elio_alerts_preferences: prefs })
    .eq('client_id', clientId)

  if (updateError) {
    return errorResponse('Erreur lors de la sauvegarde', 'DB_ERROR', updateError)
  }

  return successResponse(true)
}
