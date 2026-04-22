import { z } from 'zod'

// --- Enums ---

export const ParcoursStepStatusValues = ['locked', 'current', 'completed', 'skipped', 'pending_review'] as const
export type ParcoursStepStatus = typeof ParcoursStepStatusValues[number]

// --- DB Types (snake_case, from Supabase) ---

export interface ParcoursDB {
  id: string
  client_id: string
  template_id: string | null
  name: string
  description: string | null
  status: string
  completed_at: string | null
  abandonment_reason: string | null
  created_at: string
  updated_at: string
}

export interface ParcoursStepDB {
  id: string
  parcours_id: string
  step_number: number
  title: string
  description: string
  brief_template: string | null
  brief_content: string | null
  brief_assets: string[] | null
  one_teasing_message: string | null
  status: ParcoursStepStatus
  completed_at: string | null
  validation_required: boolean
  validation_id: string | null
  created_at: string
  updated_at: string
}

// --- App Types (camelCase) ---

export interface Parcours {
  id: string
  clientId: string
  templateId: string | null
  name: string
  description: string | null
  status: string
  completedAt: string | null
  abandonmentReason: string | null
  createdAt: string
  updatedAt: string
}

export interface ParcoursStep {
  id: string
  parcoursId: string
  stepNumber: number
  title: string
  description: string
  briefTemplate: string | null
  briefContent: string | null
  briefAssets: string[]
  oneTeasingMessage: string | null
  status: ParcoursStepStatus
  completedAt: string | null
  validationRequired: boolean
  validationId: string | null
  createdAt: string
  updatedAt: string
}

// --- Zod Schemas ---

export const GetParcoursInput = z.object({
  clientId: z.string().uuid('clientId invalide'),
})
export type GetParcoursInput = z.infer<typeof GetParcoursInput>

export const UpdateStepStatusInput = z.object({
  stepId: z.string().uuid('stepId invalide'),
  status: z.enum(ParcoursStepStatusValues),
})
export type UpdateStepStatusInput = z.infer<typeof UpdateStepStatusInput>

export const CompleteStepInput = z.object({
  stepId: z.string().uuid('stepId invalide'),
})
export type CompleteStepInput = z.infer<typeof CompleteStepInput>

export const SkipStepInput = z.object({
  stepId: z.string().uuid('stepId invalide'),
})
export type SkipStepInput = z.infer<typeof SkipStepInput>

// --- Result Types ---

export interface ParcoursWithSteps extends Parcours {
  steps: ParcoursStep[]
  totalSteps: number
  completedSteps: number
  progressPercent: number
}

export interface CompleteStepResult {
  nextStepUnlocked: boolean
  parcoursCompleted: boolean
}

// --- Step Submissions ---

export const SubmissionStatusValues = ['pending', 'approved', 'rejected', 'revision_requested'] as const
export type SubmissionStatus = typeof SubmissionStatusValues[number]

export const ValidateDecisionValues = ['approved', 'rejected', 'revision_requested'] as const
export type ValidateDecision = typeof ValidateDecisionValues[number]

export interface StepSubmissionDB {
  id: string
  parcours_step_id: string
  client_id: string
  submission_content: string
  submission_files: string[]
  submitted_at: string
  status: SubmissionStatus
  feedback: string | null
  feedback_at: string | null
  created_at: string
  updated_at: string
}

export interface StepSubmission {
  id: string
  parcoursStepId: string
  clientId: string
  submissionContent: string
  submissionFiles: string[]
  submittedAt: string
  status: SubmissionStatus
  feedback: string | null
  feedbackAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StepSubmissionWithStep extends StepSubmission {
  stepNumber: number
  stepTitle: string
  parcoursId: string
}

// --- Zod Schemas for Submissions ---

export const SubmitStepInput = z.object({
  stepId: z.string().uuid('stepId invalide'),
  content: z.string().min(50, 'Votre soumission doit contenir au moins 50 caractères'),
  files: z.array(z.string()).max(5, 'Maximum 5 fichiers').optional(),
})
export type SubmitStepInput = z.infer<typeof SubmitStepInput>

export const ValidateSubmissionInput = z.object({
  submissionId: z.string().uuid('submissionId invalide'),
  decision: z.enum(ValidateDecisionValues),
  feedback: z.string().optional(),
}).refine(
  (data) => data.decision === 'approved' || (data.feedback && data.feedback.length > 0),
  { message: 'Le feedback est obligatoire pour une révision ou un refus', path: ['feedback'] }
)
export type ValidateSubmissionInput = z.infer<typeof ValidateSubmissionInput>

export const GetSubmissionsInput = z.object({
  clientId: z.string().uuid('clientId invalide').optional(),
  stepId: z.string().uuid('stepId invalide').optional(),
  status: z.enum(SubmissionStatusValues).optional(),
})
export type GetSubmissionsInput = z.infer<typeof GetSubmissionsInput>

export interface SubmitStepResult {
  submissionId: string
}

export interface ValidateSubmissionResult {
  stepCompleted: boolean
}

// --- Elio Step Config (Story 14.1) ---

export const ALLOWED_ELIO_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
] as const
export type AllowedElioModel = typeof ALLOWED_ELIO_MODELS[number]

export const DEFAULT_ELIO_MODEL: AllowedElioModel = 'claude-sonnet-4-6'
export const DEFAULT_ELIO_TEMPERATURE = 1.0
export const DEFAULT_ELIO_MAX_TOKENS = 2000

export interface ElioStepConfigDB {
  id: string
  step_id: string
  persona_name: string
  persona_description: string | null
  system_prompt_override: string | null
  model: string
  temperature: number
  max_tokens: number
  custom_instructions: string | null
  created_at: string
  updated_at: string
}

export interface ElioStepConfig {
  id: string
  stepId: string
  personaName: string
  personaDescription: string | null
  systemPromptOverride: string | null
  model: string
  temperature: number
  maxTokens: number
  customInstructions: string | null
  createdAt: string
  updatedAt: string
}

export interface EffectiveElioConfig {
  personaName: string
  personaDescription: string | null
  systemPromptOverride: string | null
  model: string
  temperature: number
  maxTokens: number
  customInstructions: string | null
  source: 'step' | 'global'
}

export const UpsertElioStepConfigInput = z.object({
  stepId: z.string().uuid('stepId invalide'),
  personaName: z.string().min(1, 'Le nom du persona est requis').max(100),
  personaDescription: z.string().max(500).nullable().optional(),
  systemPromptOverride: z.string().max(4000).nullable().optional(),
  model: z.enum(ALLOWED_ELIO_MODELS, { errorMap: () => ({ message: 'Modèle non autorisé' }) }),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(100).max(8000),
  customInstructions: z.string().max(2000).nullable().optional(),
})
export type UpsertElioStepConfigInput = z.infer<typeof UpsertElioStepConfigInput>

// --- Parcours Abandonment (Story 9.3) ---

export const ParcoursStatusValues = ['en_cours', 'suspendu', 'termine', 'abandoned'] as const
export type ParcoursStatus = typeof ParcoursStatusValues[number]

export const RequestAbandonmentInput = z.object({
  clientId: z.string().uuid('clientId invalide'),
  reason: z.string().max(1000, 'La raison ne peut pas dépasser 1000 caractères').optional(),
})
export type RequestAbandonmentInput = z.infer<typeof RequestAbandonmentInput>

export const ReactivateParcoursInput = z.object({
  clientId: z.string().uuid('clientId invalide'),
})
export type ReactivateParcoursInput = z.infer<typeof ReactivateParcoursInput>

export const ABANDONMENT_REASONS = [
  "Je n'ai plus le temps en ce moment",
  'Le parcours ne correspond pas à mes attentes',
  "J'ai trouvé une autre solution",
] as const

// --- Client Parcours Agents (Story 14.3) ---

export const ClientParcoursAgentStatusValues = ['pending', 'active', 'completed', 'skipped'] as const
export type ClientParcoursAgentStatus = typeof ClientParcoursAgentStatusValues[number]

export interface ClientParcoursAgentDB {
  id: string
  client_id: string
  elio_lab_agent_id: string
  step_order: number
  step_label: string
  status: ClientParcoursAgentStatus
  created_at: string
  updated_at: string
}

export interface ClientParcoursAgent {
  id: string
  clientId: string
  elioLabAgentId: string
  stepOrder: number
  stepLabel: string
  status: ClientParcoursAgentStatus
  createdAt: string
  updatedAt: string
}

export interface ClientParcoursAgentWithDetails extends ClientParcoursAgent {
  agentName: string
  agentDescription: string | null
  agentImagePath: string | null
}

export interface ElioLabAgentDB {
  id: string
  name: string
  description: string | null
  model: string
  temperature: number
  image_path: string | null
  file_path: string
  system_prompt: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface ElioLabAgent {
  id: string
  name: string
  description: string | null
  model: string
  temperature: number
  imagePath: string | null
  filePath: string
  systemPrompt: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

// --- Step Feedback Injections (Story 14.9) ---

export const FeedbackInjectionTypeValues = ['text_feedback', 'elio_questions'] as const
export type FeedbackInjectionType = typeof FeedbackInjectionTypeValues[number]

export interface StepFeedbackInjectionDB {
  id: string
  step_id: string
  operator_id: string
  client_id: string
  content: string
  type: FeedbackInjectionType
  injected_at: string
  read_at: string | null
  created_at: string
}

export interface StepFeedbackInjection {
  id: string
  stepId: string
  operatorId: string
  clientId: string
  content: string
  type: FeedbackInjectionType
  injectedAt: string
  readAt: string | null
  createdAt: string
}

export const CreateFeedbackInjectionInput = z.object({
  stepId: z.string().uuid('stepId invalide'),
  clientId: z.string().uuid('clientId invalide'),
  content: z.string().min(1, 'Le contenu est requis').max(4000, 'Maximum 4000 caractères'),
  type: z.enum(FeedbackInjectionTypeValues),
})
export type CreateFeedbackInjectionInput = z.infer<typeof CreateFeedbackInjectionInput>

// Zod schemas

export const LaunchClientParcoursInput = z.object({
  clientId: z.string().uuid('clientId invalide'),
  steps: z.array(
    z.object({
      agentId: z.string().uuid('agentId invalide'),
      stepLabel: z.string().min(1, 'Le label est requis').max(200),
    })
  ).min(1, 'Au moins un agent est requis'),
})
export type LaunchClientParcoursInput = z.infer<typeof LaunchClientParcoursInput>

export const GetClientParcoursAgentsInput = z.object({
  clientId: z.string().uuid('clientId invalide'),
})
export type GetClientParcoursAgentsInput = z.infer<typeof GetClientParcoursAgentsInput>

export const AddParcoursStepInput = z.object({
  clientId: z.string().uuid('clientId invalide'),
  agentId: z.string().uuid('agentId invalide'),
  stepLabel: z.string().min(1, 'Le label est requis').max(200),
})
export type AddParcoursStepInput = z.infer<typeof AddParcoursStepInput>
