export type ValidationRequestType = 'brief_lab' | 'evolution_one' | 'step_submission'

export type ValidationRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_clarification'

export type ClientSummary = {
  id: string
  name: string
  company: string | null
  clientType: string
  avatarUrl: string | null
}

export type ValidationRequest = {
  id: string
  clientId: string
  operatorId: string
  parcoursId: string | null
  stepId: string | null
  type: ValidationRequestType
  title: string
  content: string
  documentIds: string[]
  status: ValidationRequestStatus
  reviewerComment: string | null
  submittedAt: string
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  // Relation jointe
  client?: ClientSummary
}

// ============================================================
// Types pour la vue détaillée (Story 7.2)
// ============================================================

export type ClientDetail = {
  id: string
  name: string
  company: string | null
  clientType: string
  avatarUrl: string | null
}

export type ParcoursDetail = {
  id: string
  name: string
  currentStepNumber: number | null
  currentStepTitle: string | null
  totalSteps: number
  completedSteps: number
}

export type DocumentSummary = {
  id: string
  name: string
  fileType: string
  fileSize: number
  filePath: string
}

export type MessageSummary = {
  id: string
  senderType: 'client' | 'operator'
  content: string
  createdAt: string
}

export type ValidationRequestSummary = {
  id: string
  title: string
  type: ValidationRequestType
  status: ValidationRequestStatus
  submittedAt: string
}

export type ValidationRequestDetail = ValidationRequest & {
  client: ClientDetail
  parcours?: ParcoursDetail
  documents: DocumentSummary[]
}

export type ValidationQueueFilters = {
  status: ValidationRequestStatus | 'all'
  type: ValidationRequestType | 'all'
  sortBy: 'submitted_at' | 'client_name'
  sortOrder: 'asc' | 'desc'
}

export const DEFAULT_VALIDATION_QUEUE_FILTERS: ValidationQueueFilters = {
  status: 'all',
  type: 'all',
  sortBy: 'submitted_at',
  sortOrder: 'asc',
}
