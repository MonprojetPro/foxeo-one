// Élio Module
export { manifest } from './manifest'

// Components — Story 8.1 (infrastructure unifiée)
export { ElioChat } from './components/elio-chat'
export { ElioThinking } from './components/elio-thinking'
export { ElioErrorMessage } from './components/elio-error-message'
export { ElioMessageItem } from './components/elio-message'

// Components — Story 8.3
export { ElioFeedback } from './components/elio-feedback'
export { ElioDocument } from './components/elio-document'
export { ElioConfigHistory } from './components/elio-config-history'
export { ElioConfigSection } from './components/elio-config-section'

// Components — Stories 6.x (Lab)
export { PersonalizeElioDialog } from './components/personalize-elio-dialog'
export { ElioGuidedSuggestions } from './components/elio-guided-suggestions'
export { GeneratedBriefDialog } from './components/generated-brief-dialog'
export { ElioGenerateBriefSection } from './components/elio-generate-brief-section'
export { OrpheusConfigForm } from './components/orpheus-config-form'
export { ElioModelSelector } from './components/elio-model-selector'
export { ElioTemperatureSlider } from './components/elio-temperature-slider'
export { ElioFeatureToggles } from './components/elio-feature-toggles'

// Hooks — Story 8.1
export { useElioChat } from './hooks/use-elio-chat'
export { useElioConfig } from './hooks/use-elio-config'

// Hooks — Story 8.2
export { useElioConversations } from './hooks/use-elio-conversations'
export { useElioMessages } from './hooks/use-elio-messages'

// Actions — Story 8.1
export { sendToElio } from './actions/send-to-elio'

// Actions — Story 8.2
export { getConversations } from './actions/get-conversations'
export { getMessages } from './actions/get-messages'
export { newConversation } from './actions/new-conversation'
export { generateWelcomeMessage, getWelcomeMessage } from './actions/generate-welcome-message'
export { generateConversationTitle } from './actions/generate-conversation-title'
export { updateConversationTitle } from './actions/update-conversation-title'
export { deleteConversation } from './actions/delete-conversation'
export { saveElioMessage } from './actions/save-elio-message'

// Actions — Story 8.3
export { submitFeedback } from './actions/submit-feedback'
export { getElioConfigHistory } from './actions/get-elio-config-history'
export { restoreElioConfig } from './actions/restore-elio-config'

// Actions — Story 8.4
export { compileLabLearnings } from './actions/compile-lab-learnings'

// Actions — Story 8.9b
export { generateDocument } from './actions/generate-document'
export { saveGeneratedDocument } from './actions/save-generated-document'
export { convertToPdf } from './actions/convert-to-pdf'
export { sendDocumentEmail } from './actions/send-document-email'

// Actions — Story 8.5
export { searchClientInfo } from './actions/search-client-info'
export type { ClientInfo } from './actions/search-client-info'

// Actions — Story 8.6
export { correctAndAdaptText } from './actions/correct-and-adapt-text'
export { generateDraft } from './actions/generate-draft'
export { adjustDraft } from './actions/adjust-draft'

// Actions — Story 3.8
export { transformMessageForClient } from './actions/transform-message-for-client'
export { TransformMessageInput } from './types/elio.types'
export type { TransformMessageResult } from './types/elio.types'

// Components — Story 8.6
export { DraftDisplay } from './components/draft-display'

// Types — Story 8.6
export type { DraftContext } from './types/elio.types'

// Actions — Stories 6.x
export { createCommunicationProfile } from './actions/create-communication-profile'
export { updateCommunicationProfile } from './actions/update-communication-profile'
export { getCommunicationProfile } from './actions/get-communication-profile'
export { generateBrief } from './actions/generate-brief'
export { submitElioBrief } from './actions/submit-elio-brief'
export { getElioConfig } from './actions/get-elio-config'
export { updateElioConfig } from './actions/update-elio-config'
export { resetElioConfig } from './actions/reset-elio-config'

// Config — Story 8.1
export { buildSystemPrompt } from './config/system-prompts'

// Config — Story 8.5
export { HUB_FEATURES_DOCUMENTATION } from './config/hub-features-documentation'
export { HUB_DATABASE_SCHEMAS } from './config/hub-database-schemas'

// Config — Story 8.9b
export { DOCUMENT_TEMPLATES, buildDocumentPrompt } from './config/document-templates'
export type { DocumentTemplateKey, DocumentTemplate } from './config/document-templates'

// Utils — Story 8.5
export { detectIntent } from './utils/detect-intent'
export type { Intent, DocumentType as IntentDocumentType } from './utils/detect-intent'

// Utils — Story 8.9b
export { getDocumentQuestions, getCollectionStatus } from './utils/document-collection'
export type { DocumentCollectionData, DocumentCollectionState, DocumentCollectionStatus } from './utils/document-collection'

// Utils — Story 8.6
export { getProfileLabels } from './utils/profile-labels'

// Components config — Story 8.5
export { HEADER_LABELS, HUB_PLACEHOLDER_DEFAULT } from './components/elio-chat'

// Utils — Stories 6.x
export { buildElioSystemPrompt } from './utils/build-system-prompt'
export type { StepContext } from './utils/build-system-prompt'

// Data
export { ELIO_SUGGESTIONS_BY_STEP } from './data/elio-suggestions'

// Types — Story 8.1
export type {
  DashboardType,
  ElioTier,
  ElioMessage,
  ElioMessageRole,
  ElioError,
  ElioErrorCode,
  CommunicationProfileFR66,
  TechnicalLevel,
  ExchangeStyle,
  AdaptedTone,
  MessageLength,
} from './types/elio.types'

export { DEFAULT_COMMUNICATION_PROFILE_FR66 } from './types/elio.types'

// Types — Story 8.2
export type {
  ElioConversation,
  ElioMessagePersisted,
  ConversationSummary,
} from './types/elio.types'

// Types — Story 8.3
export type {
  FeedbackRating,
  ElioMessageMetadata,
} from './types/elio.types'

// Types — Stories 8.6, 8.9b, 8.3 (moved from 'use server' action files)
export type {
  DraftContext,
  AdjustDraftInput,
  AdjustedDraftResult,
  DraftResult,
  GenerateDraftInput,
  SavedDocument,
  DocumentEmailDraft,
  ElioConfigHistoryEntry,
} from './types/elio.types'

export type { DocumentType } from './components/elio-document'

// Types — Stories 6.x
export type {
  CommunicationProfile,
  CommunicationProfileDB,
  PreferredTone,
  PreferredLength,
  InteractionStyle,
  ContextPreferences,
  CreateCommunicationProfileInput,
  UpdateCommunicationProfileInput,
  GetCommunicationProfileInput,
} from './types/communication-profile.types'

export {
  PreferredToneValues,
  PreferredLengthValues,
  InteractionStyleValues,
  toCommunicationProfile,
} from './types/communication-profile.types'

export type {
  ElioConfig,
  ElioConfigDB,
  ElioModel,
  UpdateElioConfigInput,
} from './types/elio-config.types'

export {
  ELIO_MODELS,
  DEFAULT_ELIO_CONFIG,
  toElioConfig,
} from './types/elio-config.types'

// Components — Story 10.1
export { ElioFloatingButton } from './components/elio-floating-button'
