// CRM Module - Gestion de la relation client
export { manifest } from './manifest'

// Components
export { ClientList } from './components/client-list'
export { ClientSearch } from './components/client-search'
export { ClientFiltersPanel } from './components/client-filters-panel'
export { EmptyClientList } from './components/empty-client-list'
export { ClientForm } from './components/client-form'
export { CreateClientDialog } from './components/create-client-dialog'
export { EditClientDialog } from './components/edit-client-dialog'
export { ClientHeader } from './components/client-header'
export { ClientTabs } from './components/client-tabs'
export type { ExtraTab } from './components/client-tabs'
export { ClientInfoTab } from './components/client-info-tab'
export { ClientTimeline } from './components/client-timeline'
export { ClientDocumentsTab } from './components/client-documents-tab'
export { ClientExchangesTab } from './components/client-exchanges-tab'
export { ClientDetailContent } from './components/client-detail-content'
export { AssignParcoursDialog } from './components/assign-parcours-dialog'
export { ParcoursStageList } from './components/parcours-stage-list'
export { AccessToggles } from './components/access-toggles'
export { ParcoursStatusBadge } from './components/parcours-status-badge'
export { CursorButton } from './components/cursor-button'
export { ClientNotesSection } from './components/client-notes-section'
export { ClientNoteCard } from './components/client-note-card'
export { PinButton } from './components/pin-button'
export { DeferDialog } from './components/defer-dialog'
export { ReminderCard } from './components/reminder-card'
export { RemindersFilter } from './components/reminders-filter'
export { ReminderDayList } from './components/reminder-day-list'
export { CreateReminderDialog } from './components/create-reminder-dialog'
export { RemindersCalendar } from './components/reminders-calendar'
export { EditReminderDialog } from './components/edit-reminder-dialog'
export { StatsDashboard } from './components/stats-dashboard'
export { KpiCard } from './components/kpi-card'
export { ClientTypeChart } from './components/client-type-chart'
export { TimePerClientTable } from './components/time-per-client-table'
export { StatsSkeleton } from './components/stats-skeleton'
export { CrmSubNav } from './components/crm-sub-nav'
export { ClientStatusBadge } from './components/client-status-badge'
export { SuspendClientDialog } from './components/suspend-client-dialog'
export { ClientLifecycleActions } from './components/client-lifecycle-actions'
export { CloseClientDialog } from './components/close-client-dialog'
export { ArchivedBanner } from './components/archived-banner'
export { UpgradeClientDialog } from './components/upgrade-client-dialog'
export { ImportCsvDialog } from './components/import-csv-dialog'
export { CsvPreviewTable } from './components/csv-preview-table'
export { CsvTemplateDownload } from './components/csv-template-download'
export { NotificationItem } from './components/notification-item'
export { CommunicationProfileForm } from './components/communication-profile-form'
export { ElioObservations } from './components/elio-observations'
export { ClientBrandingForm } from './components/client-branding-form'
export { ClientBrandingTab } from './components/client-branding-tab'

// Hooks
export { useClients } from './hooks/use-clients'
export { useClient } from './hooks/use-client'
export { useClientActivityLogs } from './hooks/use-client-activity-logs'
export { useClientDocuments } from './hooks/use-client-documents'
export { useClientExchanges } from './hooks/use-client-exchanges'
export { useParcoursTemplates } from './hooks/use-parcours-templates'
export { useClientParcours } from './hooks/use-client-parcours'
export { useClientNotes } from './hooks/use-client-notes'
export { useReminders, useCreateReminder, useUpdateReminder, useToggleReminderComplete, useDeleteReminder } from './hooks/use-reminders'
export { usePortfolioStats, useGraduationRate } from './hooks/use-portfolio-stats'
export { useTimePerClient } from './hooks/use-time-per-client'
export { useNotifications, useMarkNotificationRead, useImportCsv } from './hooks/use-notifications'

// Actions
export { getClients } from './actions/get-clients'
export { createClient } from './actions/create-client'
export { updateClient } from './actions/update-client'
export { getClient } from './actions/get-client'
export { getActivityLogs } from './actions/get-activity-logs'
export { getClientDocuments } from './actions/get-client-documents'
export { getClientExchanges } from './actions/get-client-exchanges'
export { getParcoursTemplates } from './actions/get-parcours-templates'
export { assignParcours } from './actions/assign-parcours'
export { getClientParcours } from './actions/get-client-parcours'
export { toggleAccess } from './actions/toggle-access'
export { suspendParcours } from './actions/suspend-parcours'
export { createClientNote } from './actions/create-client-note'
export { getClientNotes } from './actions/get-client-notes'
export { updateClientNote } from './actions/update-client-note'
export { deleteClientNote } from './actions/delete-client-note'
export { togglePinClient } from './actions/toggle-pin-client'
export { deferClient } from './actions/defer-client'
export { getReminders } from './actions/get-reminders'
export { createReminder } from './actions/create-reminder'
export { updateReminder } from './actions/update-reminder'
export { toggleReminderComplete } from './actions/toggle-reminder-complete'
export { deleteReminder } from './actions/delete-reminder'
export { getPortfolioStats } from './actions/get-portfolio-stats'
export { getGraduationRate } from './actions/get-graduation-rate'
export { getTimePerClient } from './actions/get-time-per-client'
export { suspendClient } from './actions/suspend-client'
export { reactivateClient } from './actions/reactivate-client'
export { closeClient } from './actions/close-client'
export { upgradeClient } from './actions/upgrade-client'
export { importClientsCsv } from './actions/import-clients-csv'
export { getNotifications } from './actions/get-notifications'
export { markNotificationRead } from './actions/mark-notification-read'
export { updateCommunicationProfile as updateElioCommunicationProfile } from './actions/update-communication-profile'
export { getClientCommunicationProfile } from './actions/get-communication-profile'
export { useClientCommunicationProfile } from './hooks/use-communication-profile'
export { integrateObservation, type ObservationTarget } from './actions/integrate-observation'
export { getElioObservations, type ElioObservation } from './actions/get-elio-observations'
export { updateClientBranding } from './actions/update-client-branding'
export { uploadClientLogo } from './actions/upload-client-logo'
export { getClientBranding } from './actions/get-client-branding'

// Utils
export {
  buildClientSlug,
  buildBmadPath,
  buildCursorUrl,
  toKebabCase,
  BMAD_BASE_PATH,
} from './utils/cursor-integration'
export { TIME_ESTIMATES } from './utils/time-estimates'
export type { TimeEstimateConfig } from './utils/time-estimates'
export { parseCsv, generateCsvTemplate } from './utils/csv-parser'
export { validateCsvRows, validateCsvRow, isValidEmail, markDuplicateEmails } from './utils/csv-validator'

// Zod Schemas (re-exported as values for external validation)
export { ImportCsvInput as ImportCsvInputSchema, CsvImportRow as CsvImportRowSchema } from './types/crm.types'

// Types
export type {
  Client,
  ClientListItem,
  ClientFilters,
  ClientType,
  ClientStatus,
  ClientDB,
  CreateClientInput,
  UpdateClientInput,
  ActivityLog,
  ActivityLogType,
  ClientConfig,
  ClientDocument,
  ClientExchange,
  ParcoursTemplate,
  Parcours,
  ParcoursStage,
  ParcoursType,
  ParcoursStatus,
  ActiveStage,
  AssignParcoursInput,
  ToggleAccessInput,
  ParcoursTemplateDB,
  ParcoursDB,
  ClientNote,
  CreateClientNoteInput,
  UpdateClientNoteInput,
  DeferClientInput,
  ClientNoteDB,
  Reminder,
  ReminderFilter,
  CreateReminderInput,
  UpdateReminderInput,
  ToggleReminderCompleteInput,
  ReminderDB,
  PortfolioStats,
  StatusCounts,
  TypeCounts,
  MrrInfo,
  GraduationRate,
  ClientTimeEstimate,
  SuspendClientInput,
  ReactivateClientInput,
  CloseClientInput,
  UpgradeClientInput,
  Notification,
  NotificationType,
  NotificationDB,
  CsvImportRow,
  CsvValidationResult,
  CsvImportResult,
  ImportCsvInput,
  ValidatedCsvRow,
} from './types/crm.types'
