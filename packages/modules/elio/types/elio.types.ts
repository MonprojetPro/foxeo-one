import { z } from 'zod'
import type { ActionError } from '@monprojetpro/types'

// --- Dashboard Types ---

export type DashboardType = 'hub' | 'lab' | 'one'

// --- Action interfaces (moved from 'use server' files — non-async exports forbidden) ---

export interface DraftContext {
  previousDraft: string
  clientName: string
  draftType: 'email' | 'validation_hub' | 'chat'
  currentVersion?: number
}

export interface AdjustDraftInput {
  previousDraft: string
  instruction: string
  clientName: string
  draftType: 'email' | 'validation_hub' | 'chat'
  currentVersion?: number
}

export interface AdjustedDraftResult {
  content: string
  draftType: 'email' | 'validation_hub' | 'chat'
  clientName: string
  version: number
}

export interface DraftResult {
  content: string
  draftType: 'email' | 'validation_hub' | 'chat'
  clientName: string
}

export interface GenerateDraftInput {
  clientName: string
  draftType: 'email' | 'validation_hub' | 'chat'
  subject: string
  recentContext?: string[]
}

export interface SavedDocument {
  id: string
  clientId: string
  title: string
  content: string
  source: string
  createdAt: string
}

export interface DocumentEmailDraft {
  mailtoUrl: string
  subject: string
}

export interface ElioConfigHistoryEntry {
  id: string
  clientId: string
  fieldChanged: string
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  changedAt: string
  changedBy: string | null
}

/**
 * Tier Élio pour le dashboard One uniquement ('one' | 'one_plus').
 * Note : distinct de ElioTier dans @monprojetpro/types qui inclut aussi 'lab' et les anciens noms avec tirets.
 * Les valeurs ici correspondent aux valeurs DB (colonne client_configs.elio_tier).
 */
export type ElioTier = 'one' | 'one_plus'

// --- Transform Message Types (Story 3.8) ---

export const TransformMessageInput = z.object({
  clientId: z.string().uuid('clientId doit être un UUID valide'),
  rawMessage: z.string().min(1, 'Le message ne peut pas être vide').max(4000),
})
export type TransformMessageInput = z.infer<typeof TransformMessageInput>

export interface TransformMessageResult {
  transformedText: string
  profileUsed: {
    tone: string
    length: string
    style: string
  } | null
}

// --- Message Types ---

export type ElioMessageRole = 'user' | 'assistant'

// Story 8.3: feedback rating type
export type FeedbackRating = 'useful' | 'not_useful'

// Story 8.3: metadata interface for persisted messages
export interface ElioMessageMetadata {
  feedback?: {
    rating: FeedbackRating
    createdAt: string
  }
  documentId?: string
  /** Nom du document — Story 8.3: document attaché, Story 8.9b: document généré */
  documentName?: string
  /** Type de document — Story 8.3: format fichier, Story 8.9b: type template (attestation_presence, etc.) */
  documentType?: 'pdf' | 'doc' | 'image' | 'markdown' | string
  isElioGenerated?: boolean
  documentPreview?: string
  profileObservation?: string
  draftType?: 'email' | 'validation_hub' | 'chat'
  evolutionBrief?: boolean
  // Story 8.7: escalade MiKL quand confiance basse
  needsEscalation?: boolean
  // Story 8.8: évolution détectée — lancer la collecte côté client
  evolutionDetected?: boolean
  evolutionInitialRequest?: string
  // Story 8.8: fonctionnalité existante détectée
  existingFeatureInstructions?: string
  // Story 8.9a: action module One+ en attente de confirmation
  pendingAction?: {
    module: string
    verb: 'send' | 'create' | 'update' | 'delete'
    target: string
    params?: Record<string, unknown>
    requiresDoubleConfirm?: boolean
  }
  requiresConfirmation?: boolean
  // Story 8.9b: génération de documents One+
  documentCollecting?: boolean       // en cours de collecte d'infos pour un document
  missingFields?: string[]           // champs manquants à collecter
  generatedDocument?: boolean        // document généré par Élio dans ce message
  // Story 14.5: message injecté par MiKL dans le contexte de l'étape (fond orange)
  injectedByMikl?: boolean
}

// Story 8.7 — Task 3.1 : Structure documentation module actif (injectée par MiKL, Story 10.3)
export interface ModuleDocumentation {
  description: string
  parameters?: Record<string, string>
  clientQuestions?: string[]
  commonIssues?: string[]
}

export interface ElioMessage {
  id: string
  role: ElioMessageRole
  content: string
  createdAt: string
  dashboardType: DashboardType
  isError?: boolean
  // Story 8.2: persistance en base
  conversationId?: string
  // Story 8.3: metadata pour feedback + documents
  metadata?: ElioMessageMetadata
}

// --- Conversation Types (Story 8.2) ---

export interface ElioConversation {
  id: string
  userId: string
  dashboardType: DashboardType
  title: string
  createdAt: string
  updatedAt: string
  lastMessagePreview?: string
  /** Story 9.2 — conversations Lab consultables en lecture seule depuis One */
  isReadOnly?: boolean
}

export interface ElioMessagePersisted {
  id: string
  conversationId: string
  role: ElioMessageRole
  content: string
  metadata: ElioMessageMetadata
  createdAt: string
}

export interface ConversationSummary {
  id: string
  title: string
  lastMessage: string
  lastMessageDate: string
  isActive: boolean
}

// --- Error Types ---

export type ElioErrorCode = 'TIMEOUT' | 'NETWORK_ERROR' | 'LLM_ERROR' | 'UNKNOWN' | 'CONFIG_ERROR'

export interface ElioError extends ActionError {
  code: ElioErrorCode
}

// --- Communication Profile (FR66) ---

export type TechnicalLevel = 'beginner' | 'intermediaire' | 'advanced'
export type ExchangeStyle = 'direct' | 'conversationnel' | 'formel'
export type AdaptedTone = 'formel' | 'pro_decontracte' | 'chaleureux' | 'coach'
export type MessageLength = 'court' | 'moyen' | 'detaille'

export interface CommunicationProfileFR66 {
  levelTechnical: TechnicalLevel
  styleExchange: ExchangeStyle
  adaptedTone: AdaptedTone
  messageLength: MessageLength
  tutoiement: boolean
  concreteExamples: boolean
  avoid: string[]
  privilege: string[]
  styleNotes: string
}

export const DEFAULT_COMMUNICATION_PROFILE_FR66: CommunicationProfileFR66 = {
  levelTechnical: 'intermediaire',
  styleExchange: 'conversationnel',
  adaptedTone: 'pro_decontracte',
  messageLength: 'moyen',
  tutoiement: false,
  concreteExamples: true,
  avoid: [],
  privilege: [],
  styleNotes: '',
}

// --- Proactive Alerts (Story 8.9c) ---

export interface ProactiveAlert {
  id: string
  moduleId: string
  condition: string          // SQL-like : "SELECT COUNT(*) FROM ... WHERE ..."
  message: string            // Template : "Vous avez {count} cotisations impayées"
  frequency: 'daily' | 'weekly' | 'on_event'
  lastTriggered: string | null
  enabled: boolean
}

export interface ElioAlertsPreferences {
  alerts: ProactiveAlert[]
  max_per_day: number
  sent_today: number
  last_reset: string          // Date du dernier reset du compteur (YYYY-MM-DD)
}

// --- Zod Schemas (Story 8.9c) ---

export const proactiveAlertSchema = z.object({
  id: z.string().min(1, 'id requis'),
  moduleId: z.string().min(1, 'moduleId requis'),
  condition: z.string().min(1, 'condition requise'),
  message: z.string().min(1, 'message requis'),
  frequency: z.enum(['daily', 'weekly', 'on_event']),
  lastTriggered: z.string().nullable(),
  enabled: z.boolean(),
})

export const elioAlertsPreferencesSchema = z.object({
  alerts: z.array(proactiveAlertSchema),
  max_per_day: z.number().int().min(1).max(10),
  sent_today: z.number().int().min(0),
  last_reset: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis'),
})

// --- Elio Config (unified) ---
// Note: ElioUnifiedConfig sera ajouté quand getElioConfig sera enrichi (Story 8.2+)
// pour combiner ElioConfig + CommunicationProfileFR66 + tier en un seul type.
