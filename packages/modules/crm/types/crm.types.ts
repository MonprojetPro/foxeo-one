import { z } from 'zod'
import { createClientSchema, updateClientSchema } from '@monprojetpro/utils'

// Client type enums
export const ClientTypeEnum = z.enum(['complet', 'direct_one', 'ponctuel'])
export const ClientStatusEnum = z.enum(['active', 'suspended', 'archived', 'deleted', 'prospect'])
export const ProspectStageEnum = z.enum(['nouveau', 'qualifié', 'sans_suite'])

// Client Config types (from client_configs table)
export const ClientConfig = z.object({
  activeModules: z.array(z.string()),
  dashboardType: z.enum(['one', 'lab']),
  themeVariant: z.string().nullable().optional(),
  parcoursConfig: z.record(z.unknown()).optional(),
  // Story 9.4 — Subscription tier
  subscriptionTier: z.enum(['base', 'essentiel', 'agentique']).nullable().optional(),
  tierChangedAt: z.string().datetime({ offset: true }).nullable().optional(),
})

export type ClientConfig = z.infer<typeof ClientConfig>

// Full Client schema (for detailed views and operations)
export const Client = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  firstName: z.string().optional(),
  name: z.string().min(1, 'Le nom est requis'),
  company: z.string().min(1, 'L\'entreprise est requise'),
  email: z.string().email('Email invalide'),
  clientType: ClientTypeEnum,
  status: ClientStatusEnum,
  sector: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  suspendedAt: z.string().datetime({ offset: true }).nullable().optional(),
  archivedAt: z.string().datetime({ offset: true }).nullable().optional(),
  retentionUntil: z.string().datetime({ offset: true }).nullable().optional(),
  previousStatus: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  config: ClientConfig.optional(),
})

export type Client = z.infer<typeof Client>
export type ClientType = z.infer<typeof ClientTypeEnum>
export type ClientStatus = z.infer<typeof ClientStatusEnum>
export type ProspectStage = z.infer<typeof ProspectStageEnum>

// Client list item schema (optimized for list views)
export const ClientListItem = z.object({
  id: z.string().uuid(),
  firstName: z.string().optional(),
  name: z.string(),
  company: z.string(),
  email: z.string().optional(),
  sector: z.string().optional(),
  clientType: ClientTypeEnum,
  status: ClientStatusEnum,
  createdAt: z.string().datetime({ offset: true }),
  isPinned: z.boolean().optional(),
  deferredUntil: z.string().datetime({ offset: true }).nullable().optional(),
  archivedAt: z.string().datetime({ offset: true }).nullable().optional(),
  retentionUntil: z.string().datetime({ offset: true }).nullable().optional(),
  // Prospect fields (Story parcours entrée)
  hubSeenAt: z.string().datetime({ offset: true }).nullable().optional(),
  prospectStage: ProspectStageEnum.nullable().optional(),
  projectType: z.string().nullable().optional(),
  leadMessage: z.string().nullable().optional(),
})

export type ClientListItem = z.infer<typeof ClientListItem>

// Client filters schema (for search and filtering)
export const ClientFilters = z.object({
  search: z.string().optional(),
  clientType: z.array(ClientTypeEnum).optional(),
  status: z.array(ClientStatusEnum).optional(),
  sector: z.array(z.string()).optional()
})

export type ClientFilters = z.infer<typeof ClientFilters>

// Create/Update input schemas (re-exported from @monprojetpro/utils)
export const CreateClientInput = createClientSchema
export const UpdateClientInput = updateClientSchema

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>

// Helper type for DB → API transformation
export type ClientDB = {
  id: string
  operator_id: string
  first_name?: string
  name: string
  company: string
  email: string
  client_type: 'complet' | 'direct_one' | 'ponctuel'
  status: 'active' | 'suspended' | 'archived' | 'deleted'
  sector?: string
  phone?: string
  website?: string
  notes?: string
  suspended_at?: string | null
  archived_at?: string | null
  retention_until?: string | null
  previous_status?: string | null
  created_at: string
  updated_at: string
}

// Activity Log types (for client timeline/history)
// eventType maps to the `action` column in the activity_logs DB table
export const ActivityLogTypeEnum = z.string()

export const ActivityLog = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  eventType: ActivityLogTypeEnum,
  eventData: z.record(z.unknown()).optional(),
  description: z.string(),
  createdAt: z.string().datetime({ offset: true })
})

export type ActivityLog = z.infer<typeof ActivityLog>
export type ActivityLogType = string

// Client Document types (stub for Epic 4)
export const ClientDocument = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['brief', 'livrable', 'rapport', 'autre']),
  url: z.string().url().optional(),
  visibleToClient: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
})

export type ClientDocument = z.infer<typeof ClientDocument>

// Client Exchange types (stub for Epic 3)
export const ClientExchange = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  type: z.enum(['message', 'notification', 'elio_summary']),
  content: z.string(),
  createdAt: z.string().datetime({ offset: true })
})

export type ClientExchange = z.infer<typeof ClientExchange>

// ============================================================
// Parcours types (Story 2.4)
// ============================================================

// Enums
export const ParcoursTypeEnum = z.enum(['complet', 'partiel', 'ponctuel'])
export type ParcoursType = z.infer<typeof ParcoursTypeEnum>

export const ParcoursStatusEnum = z.enum(['en_cours', 'suspendu', 'termine', 'abandoned'])
export type ParcoursStatus = z.infer<typeof ParcoursStatusEnum>

export const StageStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'skipped'])

// Stage definition (in parcours_templates.stages)
export const ParcoursStage = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  order: z.number().int().positive(),
})

export type ParcoursStage = z.infer<typeof ParcoursStage>

// Active stage (in parcours.active_stages)
export const ActiveStage = z.object({
  key: z.string().min(1),
  active: z.boolean(),
  status: StageStatusEnum,
})

export type ActiveStage = z.infer<typeof ActiveStage>

// ParcoursTemplate schema
export const ParcoursTemplate = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  parcoursType: ParcoursTypeEnum,
  stages: z.array(ParcoursStage),
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export type ParcoursTemplate = z.infer<typeof ParcoursTemplate>

// Parcours schema
export const Parcours = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  templateId: z.string().uuid().nullable(),
  operatorId: z.string().uuid(),
  activeStages: z.array(ActiveStage),
  status: ParcoursStatusEnum,
  startedAt: z.string().datetime({ offset: true }),
  suspendedAt: z.string().datetime({ offset: true }).nullable(),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  abandonmentReason: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export type Parcours = z.infer<typeof Parcours>

// Input schemas
export const AssignParcoursInput = z.object({
  clientId: z.string().uuid(),
  templateId: z.string().uuid(),
  activeStages: z.array(z.object({
    key: z.string().min(1),
    active: z.boolean(),
  })),
})

export type AssignParcoursInput = z.infer<typeof AssignParcoursInput>

export const ToggleAccessInput = z.object({
  clientId: z.string().uuid(),
  accessType: z.enum(['lab', 'one']),
  enabled: z.boolean(),
})

export type ToggleAccessInput = z.infer<typeof ToggleAccessInput>

// DB types (snake_case)
export type ParcoursTemplateDB = {
  id: string
  operator_id: string
  name: string
  description: string | null
  parcours_type: 'complet' | 'partiel' | 'ponctuel'
  stages: ParcoursStage[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ParcoursDB = {
  id: string
  client_id: string
  template_id: string | null
  operator_id: string
  active_stages: ActiveStage[]
  status: 'en_cours' | 'suspendu' | 'termine' | 'abandoned'
  started_at: string
  suspended_at: string | null
  completed_at: string | null
  abandonment_reason: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Client Notes types (Story 2.6)
// ============================================================

// ClientNote schema
export const ClientNote = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  operatorId: z.string().uuid(),
  content: z.string().min(1, 'Le contenu de la note est requis'),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export type ClientNote = z.infer<typeof ClientNote>

// Input schemas
export const CreateClientNoteInput = z.object({
  clientId: z.string().uuid(),
  content: z.string().min(1, 'Le contenu de la note est requis').max(5000, 'La note ne peut pas dépasser 5000 caractères'),
})

export type CreateClientNoteInput = z.infer<typeof CreateClientNoteInput>

export const UpdateClientNoteInput = z.object({
  noteId: z.string().uuid(),
  content: z.string().min(1, 'Le contenu de la note est requis').max(5000, 'La note ne peut pas dépasser 5000 caractères'),
})

export type UpdateClientNoteInput = z.infer<typeof UpdateClientNoteInput>

export const DeferClientInput = z.object({
  clientId: z.string().uuid(),
  deferredUntil: z.string().datetime({ offset: true }).nullable(), // null clears the defer
})

export type DeferClientInput = z.infer<typeof DeferClientInput>

// DB type (snake_case)
export type ClientNoteDB = {
  id: string
  client_id: string
  operator_id: string
  content: string
  created_at: string
  updated_at: string
}

// ============================================================
// Reminders types (Story 2.7)
// ============================================================

// Reminder filter enum
export const ReminderFilterEnum = z.enum(['all', 'upcoming', 'overdue', 'completed'])
export type ReminderFilter = z.infer<typeof ReminderFilterEnum>

// Reminder schema
export const Reminder = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().nullable(),
  dueDate: z.string().datetime({ offset: true }),
  completed: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export type Reminder = z.infer<typeof Reminder>

// Input schemas
export const CreateReminderInput = z.object({
  clientId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, 'Le titre est requis').max(200, 'Le titre ne peut pas dépasser 200 caractères'),
  description: z.string().max(1000, 'La description ne peut pas dépasser 1000 caractères').nullable().optional(),
  dueDate: z.string().datetime({ offset: true }),
})

export type CreateReminderInput = z.infer<typeof CreateReminderInput>

export const UpdateReminderInput = z.object({
  reminderId: z.string().uuid(),
  title: z.string().min(1, 'Le titre est requis').max(200, 'Le titre ne peut pas dépasser 200 caractères').optional(),
  description: z.string().max(1000, 'La description ne peut pas dépasser 1000 caractères').nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
})

export type UpdateReminderInput = z.infer<typeof UpdateReminderInput>

export const ToggleReminderCompleteInput = z.object({
  reminderId: z.string().uuid(),
})

export type ToggleReminderCompleteInput = z.infer<typeof ToggleReminderCompleteInput>

// DB type (snake_case)
export type ReminderDB = {
  id: string
  operator_id: string
  client_id: string | null
  title: string
  description: string | null
  due_date: string
  completed: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// Stats types (Story 2.8)
// ============================================================

// Status counts for portfolio stats
export const StatusCounts = z.object({
  active: z.number().int().nonnegative(),
  archived: z.number().int().nonnegative(),
  suspended: z.number().int().nonnegative(),
})

export type StatusCounts = z.infer<typeof StatusCounts>

// Type counts for portfolio stats
export const TypeCounts = z.object({
  complet: z.number().int().nonnegative(),
  directOne: z.number().int().nonnegative(),
  ponctuel: z.number().int().nonnegative(),
})

export type TypeCounts = z.infer<typeof TypeCounts>

// Dashboard-type counts (source of truth post ADR-01 Rev 2)
export const DashboardTypeCounts = z.object({
  lab: z.number().int().nonnegative(),
  one: z.number().int().nonnegative(),
})

export type DashboardTypeCounts = z.infer<typeof DashboardTypeCounts>

// MRR info (conditional on billing module)
export const MrrInfo = z.discriminatedUnion('available', [
  z.object({ available: z.literal(false), message: z.string() }),
  z.object({ available: z.literal(true), amount: z.number() }),
])

export type MrrInfo = z.infer<typeof MrrInfo>

// Portfolio stats (AC1)
// NOTE (ADR-01 Rev 2): `byType` is a HISTORICAL label (commercial origin).
// The source of truth for current dashboard behavior is `byDashboardType`,
// which reflects `client_configs.dashboard_type` (lab/one).
export const PortfolioStats = z.object({
  totalClients: z.number().int().nonnegative(),
  byStatus: StatusCounts,
  byType: TypeCounts,
  byDashboardType: DashboardTypeCounts,
  labActive: z.number().int().nonnegative(),
  oneActive: z.number().int().nonnegative(),
  mrr: MrrInfo,
})

export type PortfolioStats = z.infer<typeof PortfolioStats>

// Graduation rate (AC1)
export const GraduationRate = z.object({
  percentage: z.number().nonnegative(),
  graduated: z.number().int().nonnegative(),
  totalLabClients: z.number().int().nonnegative(),
})

export type GraduationRate = z.infer<typeof GraduationRate>

// Client time estimate (AC3)
export const ClientTimeEstimate = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  clientCompany: z.string(),
  clientType: ClientTypeEnum,
  messageCount: z.number().int().nonnegative(),
  validationCount: z.number().int().nonnegative(),
  visioSeconds: z.number().int().nonnegative(),
  totalEstimatedSeconds: z.number().int().nonnegative(),
  lastActivity: z.string().datetime({ offset: true }).nullable(),
})

export type ClientTimeEstimate = z.infer<typeof ClientTimeEstimate>

// ============================================================
// Client Lifecycle types (Story 2.9a)
// ============================================================

// Archive client input (Story 9.5c)
export const ArchiveClientInput = z.object({
  clientId: z.string().uuid(),
  retentionDays: z.number().int().min(30, 'Minimum 30 jours').max(365, 'Maximum 365 jours').optional().default(90),
})

export type ArchiveClientInput = z.infer<typeof ArchiveClientInput>

// Suspend client input (AC2)
export const SuspendClientInput = z.object({
  clientId: z.string().uuid(),
  reason: z.string().max(500, 'La raison ne peut pas dépasser 500 caractères').optional(),
})

export type SuspendClientInput = z.infer<typeof SuspendClientInput>

// Reactivate client input (AC3)
export const ReactivateClientInput = z.object({
  clientId: z.string().uuid(),
})

export type ReactivateClientInput = z.infer<typeof ReactivateClientInput>

// ============================================================
// Client Lifecycle types (Story 2.9b)
// ============================================================

// Close client input (AC1, AC2)
export const CloseClientInput = z.object({
  clientId: z.string().uuid(),
  confirmName: z.string().min(1, 'Le nom de confirmation est requis'),
})

export type CloseClientInput = z.infer<typeof CloseClientInput>

// ============================================================
// Client Upgrade types (Story 2.9c)
// ============================================================

// Input for upgrading a ponctuel client to Lab or One
export const UpgradeClientInput = z.object({
  clientId: z.string().uuid(),
  targetType: z.enum(['complet', 'direct_one']),
  parcoursConfig: z
    .object({
      templateId: z.string().uuid(),
      activeStages: z.array(
        z.object({
          key: z.string().min(1),
          active: z.boolean(),
        })
      ),
    })
    .optional(),
  modules: z.array(z.string()).optional(),
})

export type UpgradeClientInput = z.infer<typeof UpgradeClientInput>

// ============================================================
// Notification types (Story 2.10 → evolved by Story 3.2)
// ============================================================

export const NotificationTypeEnum = z.enum([
  'inactivity_alert',
  'csv_import_complete',
  'message',
  'validation',
  'alert',
  'system',
  'graduation',
  'payment',
])

export const RecipientTypeEnum = z.enum(['client', 'operator'])

export const Notification = z.object({
  id: z.string().uuid(),
  recipientType: RecipientTypeEnum,
  recipientId: z.string().uuid(),
  type: NotificationTypeEnum,
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  readAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
})

export type Notification = z.infer<typeof Notification>
export type NotificationType = z.infer<typeof NotificationTypeEnum>
export type RecipientType = z.infer<typeof RecipientTypeEnum>

// DB type (snake_case)
export type NotificationDB = {
  id: string
  recipient_type: string
  recipient_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

// ============================================================
// CSV Import types (Story 2.10)
// ============================================================

export const CsvClientTypeEnum = z.enum(['complet', 'direct_one', 'ponctuel'])

export const CsvImportRow = z.object({
  lineNumber: z.number().int().positive(),
  name: z.string(),
  email: z.string(),
  company: z.string(),
  phone: z.string(),
  sector: z.string(),
  clientType: z.string(),
})

export type CsvImportRow = z.infer<typeof CsvImportRow>

export const CsvValidationResult = z.object({
  row: CsvImportRow,
  valid: z.boolean(),
  errors: z.array(z.string()),
})

export type CsvValidationResult = z.infer<typeof CsvValidationResult>

export const CsvImportResult = z.object({
  imported: z.number().int().nonnegative(),
  ignored: z.number().int().nonnegative(),
  errors: z.array(z.string()),
})

export type CsvImportResult = z.infer<typeof CsvImportResult>

// Input schema for CSV import server action
export const ImportCsvInput = z.object({
  rows: z.array(CsvImportRow).min(1, 'Au moins une ligne est requise').max(500, 'Maximum 500 lignes par import'),
})

export type ImportCsvInput = z.infer<typeof ImportCsvInput>

// Validated row ready for DB insertion
export const ValidatedCsvRow = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string(),
  phone: z.string(),
  sector: z.string(),
  clientType: CsvClientTypeEnum,
})

export type ValidatedCsvRow = z.infer<typeof ValidatedCsvRow>
