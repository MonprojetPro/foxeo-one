export const ELIO_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
] as const

export type ElioModel = (typeof ELIO_MODELS)[number]

export interface ElioConfig {
  model: ElioModel
  temperature: number
  maxTokens: number
  customInstructions: string | null
  enabledFeatures: Record<string, boolean>
}

export interface ElioConfigDB {
  id: string
  client_id: string
  model: string
  temperature: number
  max_tokens: number
  custom_instructions: string | null
  enabled_features: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface UpdateElioConfigInput {
  model: ElioModel
  temperature: number
  maxTokens: number
  customInstructions?: string
  enabledFeatures?: Record<string, boolean>
}

export const DEFAULT_ELIO_CONFIG: ElioConfig = {
  model: 'claude-sonnet-4-6',
  temperature: 1.0,
  maxTokens: 1500,
  customInstructions: null,
  enabledFeatures: {},
}

export function toElioConfig(db: ElioConfigDB): ElioConfig {
  const validModel = ELIO_MODELS.includes(db.model as ElioModel)
    ? (db.model as ElioModel)
    : DEFAULT_ELIO_CONFIG.model

  return {
    model: validModel,
    temperature: db.temperature,
    maxTokens: db.max_tokens,
    customInstructions: db.custom_instructions,
    enabledFeatures: db.enabled_features ?? {},
  }
}
