/**
 * Config d'escalade Élio One → MiKL (pilotage depuis le Hub — lot 2).
 *
 * Stockée dans `system_config` sous la clé `elio_one_escalation`. Pilote, au niveau
 * GLOBAL (tous les clients gradués One), si et comment Élio One propose de transmettre
 * une question à MiKL quand sa confiance est basse :
 *  • `enabled`        — interrupteur maître (false → Élio One ne propose jamais l'escalade).
 *  • `sensitivity`    — à quel point Élio escalade facilement (consommé plus tard par le
 *    seuil de confiance ; pour l'instant stocké + affiché dans le Hub).
 *  • `escalationHint` — phrase personnalisable pour le bandeau d'escalade (optionnel).
 *
 * Fichier NON-'use server' : schémas Zod, types et constantes vivent ici
 * (un `export const` dans un fichier 'use server' casse `next build`
 * — cf. leçon use-server-exports-async-only).
 */
import { z } from 'zod'

/** Clé `system_config` portant la config globale d'escalade Élio One. */
export const ELIO_ESCALATION_KEY = 'elio_one_escalation'

/** Longueur max du bandeau d'escalade personnalisable. */
export const ESCALATION_HINT_MAX = 300

/** Sensibilités d'escalade disponibles (du plus prudent au plus enclin à escalader). */
export const ESCALATION_SENSITIVITIES = ['low', 'normal', 'high'] as const

export const EscalationConfigSchema = z.object({
  /** Interrupteur maître : si false, Élio One ne propose jamais l'escalade. */
  enabled: z.boolean(),
  /** À quel point Élio escalade facilement (consommé plus tard par le seuil de confiance). */
  sensitivity: z.enum(ESCALATION_SENSITIVITIES),
  /** Phrase du bandeau d'escalade (optionnelle, vide = message par défaut du chat). */
  escalationHint: z
    .string()
    .trim()
    .max(ESCALATION_HINT_MAX, `Le message ne peut pas dépasser ${ESCALATION_HINT_MAX} caractères`)
    .optional(),
})

export type EscalationConfig = z.infer<typeof EscalationConfigSchema>

/** Défauts — appliqués en fallback si la clé est absente ou invalide. */
export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  enabled: true,
  sensitivity: 'normal',
}
