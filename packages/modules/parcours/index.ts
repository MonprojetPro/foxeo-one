// Parcours Lab Module
export { manifest } from './manifest'

// Components — Parcours
export { ParcoursOverview } from './components/parcours-overview'
export { ParcoursProgressBar } from './components/parcours-progress-bar'
export { ParcoursStepCard } from './components/parcours-step-card'
export { ElioParcoursPanel } from './components/elio-parcours-panel'
export { ParcoursStepDetail } from './components/parcours-step-detail'
export { ParcoursStepStatusBadge } from './components/parcours-step-status-badge'
export { ParcoursTimeline } from './components/parcours-timeline'
export { BriefMarkdownRenderer } from './components/brief-markdown-renderer'
export { BriefAssetsGallery } from './components/brief-assets-gallery'
export { OneTeasingCard } from './components/one-teasing-card'
export { StepNavigationButtons } from './components/step-navigation-buttons'

// Components — Submissions (Story 6.3)
export { SubmitStepForm } from './components/submit-step-form'
export { SubmissionFileUpload } from './components/submission-file-upload'
export { SubmissionStatusBadge } from './components/submission-status-badge'
export { SubmissionsList } from './components/submissions-list'
export { SubmissionDetailView } from './components/submission-detail-view'
export { ValidateSubmissionForm } from './components/validate-submission-form'

// Hooks
export { useParcours } from './hooks/use-parcours'
export { useParcoursSteps } from './hooks/use-parcours-steps'
export { useStepSubmissions } from './hooks/use-step-submissions'

// Components — Abandonment (Story 9.3)
export { AbandonParcoursDialog } from './components/abandon-parcours-dialog'

// Components — Elio Step Config (Story 14.1)
export { StepElioConfigPanel } from './components/step-elio-config-panel'

// Components — Assemblage Parcours Client (Story 14.3)
export { ClientParcoursAgentsList } from './components/client-parcours-agents-list'
export { LaunchParcoursModal } from './components/launch-parcours-modal'
export { AddStepModal } from './components/add-step-modal'

// Actions — Assemblage Parcours Client (Story 14.3)
export { launchClientParcours } from './actions/launch-client-parcours'
export { getClientParcoursAgents } from './actions/get-client-parcours-agents'
export { addParcoursStep } from './actions/add-parcours-step'

// Actions
export { getParcours } from './actions/get-parcours'
export { updateStepStatus } from './actions/update-step-status'
export { completeStep } from './actions/complete-step'
export { skipStep } from './actions/skip-step'
export { submitStep } from './actions/submit-step'
export { validateSubmission } from './actions/validate-submission'
export { getSubmissions } from './actions/get-submissions'
export { getSubmissionById } from './actions/get-submission-by-id'
export { requestParcoursAbandonment } from './actions/request-abandonment'
export { reactivateParcours } from './actions/reactivate-parcours'
export { startLabExitKit } from './actions/start-lab-exit-kit'
export type { StartLabExitKitInput } from './actions/start-lab-exit-kit'
export { getStepElioConfig } from './actions/get-step-elio-config'
export { upsertStepElioConfig } from './actions/upsert-step-elio-config'
export { getEffectiveElioConfig } from './actions/get-effective-elio-config'

// Types
export type {
  Parcours,
  ParcoursDB,
  ParcoursStep,
  ParcoursStepDB,
  ParcoursStepStatus,
  ParcoursWithSteps,
  CompleteStepResult,
  GetParcoursInput,
  UpdateStepStatusInput,
  CompleteStepInput,
  SkipStepInput,
  ElioStepConfig,
  ElioStepConfigDB,
  EffectiveElioConfig,
  UpsertElioStepConfigInput,
  // Submission types
  StepSubmission,
  StepSubmissionDB,
  StepSubmissionWithStep,
  SubmissionStatus,
  ValidateDecision,
  SubmitStepInput,
  ValidateSubmissionInput,
  GetSubmissionsInput,
  SubmitStepResult,
  ValidateSubmissionResult,
} from './types/parcours.types'

export { ParcoursStepStatusValues, SubmissionStatusValues, ValidateDecisionValues, ParcoursStatusValues, ABANDONMENT_REASONS, ALLOWED_ELIO_MODELS, DEFAULT_ELIO_MODEL, DEFAULT_ELIO_TEMPERATURE, DEFAULT_ELIO_MAX_TOKENS } from './types/parcours.types'

export type {
  ParcoursStatus,
  RequestAbandonmentInput,
  ReactivateParcoursInput,
} from './types/parcours.types'

export type {
  ClientParcoursAgent,
  ClientParcoursAgentDB,
  ClientParcoursAgentWithDetails,
  ClientParcoursAgentStatus,
  ElioLabAgent,
  ElioLabAgentDB,
  LaunchClientParcoursInput,
  GetClientParcoursAgentsInput,
  AddParcoursStepInput,
} from './types/parcours.types'

export { ClientParcoursAgentStatusValues } from './types/parcours.types'
