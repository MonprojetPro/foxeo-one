/**
 * Config de pilotage de la navigation deep-link Élio One (lot 3 — pilotage Hub).
 *
 * Élio One oriente le client via des jetons `[[goto:CLE|Libellé]]` (cf.
 * GOTO_ROUTES dans utils/parse-goto-links.ts) et la carte ONE_NAVIGATION_MAP
 * injectée dans son system prompt. Cette config, GLOBALE, permet à MiKL depuis le
 * Hub de :
 *  • DÉSACTIVER certaines destinations (`disabledRoutes`) — ex. couper « facturation »
 *    pour une période. Les CLE désactivées sont signalées à Élio dans le prompt pour
 *    qu'il cesse d'émettre le jeton correspondant.
 *  • ajouter une CONSIGNE de navigation additionnelle (`extraNavigationNote`) injectée
 *    dans le prompt One, à la suite de ONE_NAVIGATION_MAP.
 *
 * Stockage : `system_config` clé `elio_one_navigation`
 * (pattern alert-thresholds : lecture ouverte + fallback, écriture opérateur only).
 *
 * Fichier NON-'use server' : schémas Zod, types et constantes vivent ici
 * (un `export const` dans un fichier 'use server' casse `next build`
 * — cf. leçon use-server-exports-async-only).
 */
import { z } from 'zod'

/** Clé `system_config` portant la config de navigation Élio One. */
export const ELIO_ONE_NAVIGATION_KEY = 'elio_one_navigation'

/** Longueur max de la consigne de navigation additionnelle. */
export const EXTRA_NAVIGATION_NOTE_MAX = 500

/**
 * Liste des CLE de destinations goto désactivées.
 *
 * Note : on ne restreint volontairement PAS le contenu aux clés de GOTO_ROUTES au
 * niveau du schéma (GOTO_ROUTES est la source de vérité UI ; une clé devenue obsolète
 * ne doit pas faire échouer la lecture de la config). Le consumer (send-to-elio) et
 * l'UI n'agissent que sur l'intersection avec les clés réellement présentes dans
 * GOTO_ROUTES — une CLE inconnue est donc ignorée sans erreur.
 */
const disabledRoutesField = z.array(z.string().trim().min(1)).default([])

const extraNavigationNoteField = z
  .string()
  .trim()
  .max(
    EXTRA_NAVIGATION_NOTE_MAX,
    `La consigne de navigation ne peut pas dépasser ${EXTRA_NAVIGATION_NOTE_MAX} caractères`,
  )
  .default('')

export const OneNavigationConfigSchema = z.object({
  /** CLE de destinations goto désactivées (sous-ensemble des clés de GOTO_ROUTES). */
  disabledRoutes: disabledRoutesField,
  /** Consigne de navigation additionnelle injectée dans le prompt One (optionnelle). */
  extraNavigationNote: extraNavigationNoteField,
})

export type OneNavigationConfig = z.infer<typeof OneNavigationConfigSchema>

/** Défauts — appliqués en fallback si la clé est absente/invalide. */
export const DEFAULT_ONE_NAVIGATION_CONFIG: OneNavigationConfig = {
  disabledRoutes: [],
  extraNavigationNote: '',
}
