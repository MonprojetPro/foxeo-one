import type { ParcoursDB, ParcoursStepDB, Parcours, ParcoursStep, ElioStepConfigDB, ElioStepConfig } from '../types/parcours.types'

export function toParcours(db: ParcoursDB): Parcours {
  return {
    id: db.id,
    clientId: db.client_id,
    templateId: db.template_id,
    name: db.name ?? 'Mon Parcours',
    description: db.description ?? null,
    status: db.status,
    completedAt: db.completed_at,
    abandonmentReason: db.abandonment_reason ?? null,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function toParcoursStep(db: ParcoursStepDB): ParcoursStep {
  return {
    id: db.id,
    parcoursId: db.parcours_id,
    stepNumber: db.step_number,
    title: db.title,
    description: db.description,
    briefTemplate: db.brief_template,
    briefContent: db.brief_content ?? null,
    briefAssets: db.brief_assets ?? [],
    oneTeasingMessage: db.one_teasing_message ?? null,
    status: db.status,
    completedAt: db.completed_at,
    validationRequired: db.validation_required,
    validationId: db.validation_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function toElioStepConfig(db: ElioStepConfigDB): ElioStepConfig {
  return {
    id: db.id,
    stepId: db.step_id,
    personaName: db.persona_name,
    personaDescription: db.persona_description,
    systemPromptOverride: db.system_prompt_override,
    model: db.model,
    temperature: db.temperature,
    maxTokens: db.max_tokens,
    customInstructions: db.custom_instructions,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}
