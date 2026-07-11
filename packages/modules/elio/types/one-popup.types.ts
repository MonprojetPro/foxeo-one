/**
 * Config de personnalisation de la pop-up Élio One (pilotage depuis le Hub).
 *
 * Deux niveaux de portée, fusionnés par `resolveOnePopupConfig` :
 *  • GLOBAL — stocké dans `system_config` sous la clé `elio_one_popup`
 *    (le défaut appliqué à TOUS les clients gradués One).
 *  • SURCHARGE PAR CLIENT — stockée dans `client_configs.elio_config.one_popup`
 *    (un `Partial`, propre à un client gradué : n'écrase que les champs définis).
 *
 * Résolution (règle UNIQUE, jamais recopiée ailleurs — cf. `mergeOnePopupConfig`) :
 *   DEFAULT ← global ← surcharge client   (champ par champ)
 *
 * Fichier NON-'use server' : schémas Zod, types et constantes vivent ici
 * (un `export const` dans un fichier 'use server' casse `next build`
 * — cf. leçon use-server-exports-async-only).
 */
import { z } from 'zod'

/** Clé `system_config` portant la config globale de la pop-up Élio One. */
export const ELIO_ONE_POPUP_KEY = 'elio_one_popup'

/** Nombre maximum de suggestions de démarrage rapide affichées dans la pop-up. */
export const MAX_ONE_POPUP_SUGGESTIONS = 4

const GREETING_MAX = 400
const SUGGESTION_MAX = 120
const PLACEHOLDER_MAX = 120

const greetingField = z
  .string()
  .trim()
  .min(1, "Le message d'accueil ne peut pas être vide")
  .max(GREETING_MAX, `Le message d'accueil ne peut pas dépasser ${GREETING_MAX} caractères`)

const suggestionsField = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'Une suggestion ne peut pas être vide')
      .max(SUGGESTION_MAX, `Une suggestion ne peut pas dépasser ${SUGGESTION_MAX} caractères`),
  )
  .max(MAX_ONE_POPUP_SUGGESTIONS, `${MAX_ONE_POPUP_SUGGESTIONS} suggestions maximum`)

const placeholderField = z
  .string()
  .trim()
  .min(1, 'Le placeholder ne peut pas être vide')
  .max(PLACEHOLDER_MAX, `Le placeholder ne peut pas dépasser ${PLACEHOLDER_MAX} caractères`)

/** Config globale COMPLÈTE (tous les champs requis). */
export const ElioOnePopupConfigSchema = z.object({
  /** Message d'accueil affiché à l'ouverture de la pop-up (état vide). */
  greeting: greetingField,
  /** Suggestions de démarrage rapide (chips cliquables). Peut être vide. */
  suggestions: suggestionsField,
  /** Placeholder du champ de saisie. */
  placeholder: placeholderField,
})

export type ElioOnePopupConfig = z.infer<typeof ElioOnePopupConfigSchema>

/**
 * Surcharge par client : tous les champs optionnels — n'écrase QUE ce qui est défini.
 * Un champ absent (ou une chaîne vide) = « hérite du global ».
 */
export const ElioOnePopupOverrideSchema = ElioOnePopupConfigSchema.partial()

export type ElioOnePopupOverride = z.infer<typeof ElioOnePopupOverrideSchema>

/**
 * Défauts — appliqués en fallback si la clé globale est absente/invalide.
 * Alignés sur l'ancien message d'accueil One (vouvoiement) et la navigation réelle.
 */
export const DEFAULT_ONE_POPUP_CONFIG: ElioOnePopupConfig = {
  greeting: "Bonjour ! Je suis Élio, votre assistant. Comment puis-je vous aider aujourd'hui ?",
  suggestions: [
    'Où en est mon outil ?',
    'Comment déposer un document ?',
    'Réserver une visio avec MiKL',
  ],
  placeholder: 'Comment puis-je vous aider aujourd’hui ?',
}

/**
 * Fusionne la config globale avec une éventuelle surcharge client — RÈGLE UNIQUE.
 *
 * Champ par champ : la surcharge ne l'emporte que si elle porte une valeur réellement
 * définie (chaîne non vide, ou tableau `suggestions` explicitement fourni — même vide,
 * pour permettre à un client de masquer les chips). Pure et déterministe (testable
 * sans DB) — les Server Actions se contentent de lire puis d'appeler cette fonction.
 */
export function mergeOnePopupConfig(
  base: ElioOnePopupConfig,
  override?: ElioOnePopupOverride | null,
): ElioOnePopupConfig {
  if (!override) return base
  return {
    greeting: override.greeting?.trim() ? override.greeting.trim() : base.greeting,
    suggestions: override.suggestions !== undefined ? override.suggestions : base.suggestions,
    placeholder: override.placeholder?.trim() ? override.placeholder.trim() : base.placeholder,
  }
}
