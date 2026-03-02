import type { ActionError } from '@foxeo/types'

// --- Dashboard Types ---

export type DashboardType = 'hub' | 'lab' | 'one'

export type ElioTier = 'one' | 'one_plus'

// --- Message Types ---

export type ElioMessageRole = 'user' | 'assistant'

export interface ElioMessage {
  id: string
  role: ElioMessageRole
  content: string
  createdAt: string
  dashboardType: DashboardType
  isError?: boolean
  // Story 8.2: persistance en base
  conversationId?: string
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
}

export interface ElioMessagePersisted {
  id: string
  conversationId: string
  role: ElioMessageRole
  content: string
  metadata: {
    feedback?: 'useful' | 'not_useful'
    documentId?: string
    profileObservation?: string
    draftType?: 'email' | 'validation_hub' | 'chat'
    evolutionBrief?: boolean
  }
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

// --- Elio Config (unified) ---
// Note: ElioUnifiedConfig sera ajouté quand getElioConfig sera enrichi (Story 8.2+)
// pour combiner ElioConfig + CommunicationProfileFR66 + tier en un seul type.
