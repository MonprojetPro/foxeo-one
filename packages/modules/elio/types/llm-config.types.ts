/**
 * Config LLM multi-provider (Contrat 2 — chantier Élio Hub 2026-07-06).
 *
 * Stockée dans system_config sous la clé `llm_config`. Trois profils :
 * - `default`  : le cœur d'Élio (callLLM / send-to-elio)
 * - `micro`    : micro-tâches (concierge, titres de conversation…)
 * - `hubAgent` : boucle agent Élio Hub (outils)
 *
 * Fichier NON-'use server' : les schémas Zod, types et constantes vivent ici
 * (un export const dans un fichier 'use server' casse next build).
 */
import { z } from 'zod'
import { ELIO_MODEL_CORE, ELIO_MODEL_MICRO } from '../config/models'

/** Clé system_config portant la config LLM. */
export const LLM_CONFIG_KEY = 'llm_config'

/**
 * Nom de secret Edge Function autorisé : UPPER_SNAKE_CASE finissant par _API_KEY.
 * Miroir de l'allowlist appliquée par l'Edge Function elio-chat
 * (supabase/functions/elio-chat/provider-adapter.ts — isAllowedApiKeyEnv).
 */
const API_KEY_ENV_REGEX = /^[A-Z][A-Z0-9_]*_API_KEY$/

export const LlmProfileSchema = z
  .object({
    provider: z.enum(['anthropic', 'openai-compatible']),
    model: z.string().min(1, 'Modèle requis'),
    baseUrl: z.string().url('baseUrl doit être une URL valide').nullable(),
    apiKeyEnv: z
      .string()
      .regex(API_KEY_ENV_REGEX, 'apiKeyEnv doit être UPPER_SNAKE_CASE et finir par _API_KEY'),
  })
  .superRefine((profile, ctx) => {
    if (profile.provider === 'openai-compatible' && !profile.baseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseUrl'],
        message: 'baseUrl est requis quand provider = openai-compatible',
      })
    }
  })

export const LlmConfigSchema = z.object({
  default: LlmProfileSchema,
  micro: LlmProfileSchema,
  hubAgent: LlmProfileSchema,
})

export type LlmProfile = z.infer<typeof LlmProfileSchema>
export type LlmConfig = z.infer<typeof LlmConfigSchema>
export type LlmProviderName = LlmProfile['provider']

/**
 * Défauts Anthropic (Contrat 2) — utilisés en fallback si la clé `llm_config`
 * est absente de system_config ou si sa valeur est invalide.
 */
export const DEFAULT_LLM_CONFIG: LlmConfig = {
  default: {
    provider: 'anthropic',
    model: ELIO_MODEL_CORE, // claude-sonnet-4-6
    baseUrl: null,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
  micro: {
    provider: 'anthropic',
    model: ELIO_MODEL_MICRO, // claude-haiku-4-5-20251001
    baseUrl: null,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
  hubAgent: {
    provider: 'anthropic',
    model: ELIO_MODEL_CORE, // claude-sonnet-4-6
    baseUrl: null,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
}
