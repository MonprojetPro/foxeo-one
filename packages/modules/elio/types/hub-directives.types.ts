/**
 * Directives permanentes Élio Hub (mode « Màj Élio » du widget sidebar).
 *
 * Stockées dans system_config sous la clé `elio_hub_directives` : un tableau
 * de directives `{ id, text, createdAt }` injecté dans le system prompt de
 * l'agent Élio Hub (section « Directives permanentes de MiKL »).
 *
 * Fichier NON-'use server' : schémas Zod, types et constantes vivent ici
 * (un export const dans un fichier 'use server' casse next build).
 */
import { z } from 'zod'

/** Clé system_config portant les directives permanentes Élio Hub. */
export const HUB_DIRECTIVES_KEY = 'elio_hub_directives'

/** Nombre maximum de directives simultanées. */
export const MAX_HUB_DIRECTIVES = 30

/** Longueur maximale d'une directive (caractères). */
export const HUB_DIRECTIVE_MAX_LENGTH = 500

/** Texte d'une directive — trim, jamais vide, max 500 caractères. */
export const HubDirectiveTextSchema = z
  .string()
  .trim()
  .min(1, 'La directive ne peut pas être vide')
  .max(HUB_DIRECTIVE_MAX_LENGTH, `La directive ne peut pas dépasser ${HUB_DIRECTIVE_MAX_LENGTH} caractères`)

export const HubDirectiveSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(HUB_DIRECTIVE_MAX_LENGTH),
  createdAt: z.string(),
})

export const HubDirectivesSchema = z.array(HubDirectiveSchema).max(MAX_HUB_DIRECTIVES)

export type HubDirective = z.infer<typeof HubDirectiveSchema>
