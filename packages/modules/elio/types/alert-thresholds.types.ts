/**
 * Seuils d'alertes Élio (chantier Élio Hub — T5 Pilotage, 2026-07-06).
 *
 * Stockés dans system_config sous la clé `elio_alert_thresholds`. Pilotent :
 * - les « Suggestions Élio » de l'accueil Hub (parcours stagnants, clients
 *   silencieux, validations en attente trop vieilles),
 * - configurables depuis /elio/hub (onglet Élio Hub — centre de pilotage).
 *
 * Fichier NON-'use server' : schémas Zod, types et constantes vivent ici
 * (un export const dans un fichier 'use server' casse next build).
 */
import { z } from 'zod'

/** Clé system_config portant les seuils d'alertes Élio. */
export const ALERT_THRESHOLDS_KEY = 'elio_alert_thresholds'

const dayThreshold = z
  .number()
  .int('Le seuil doit être un nombre entier de jours')
  .min(1, 'Le seuil minimum est de 1 jour')
  .max(365, 'Le seuil maximum est de 365 jours')

export const AlertThresholdsSchema = z.object({
  /** Parcours Lab sans progression depuis N jours. */
  stagnantParcoursDays: dayThreshold,
  /** Clients sans aucun message échangé depuis N jours. */
  silentClientDays: dayThreshold,
  /** Validations en attente depuis plus de N jours. */
  oldValidationDays: dayThreshold,
})

export type AlertThresholds = z.infer<typeof AlertThresholdsSchema>

/** Défauts — utilisés en fallback si la clé est absente ou invalide. */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  stagnantParcoursDays: 7,
  silentClientDays: 14,
  oldValidationDays: 3,
}
