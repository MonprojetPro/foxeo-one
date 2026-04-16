export { manifest } from './manifest'
export { provisionOneInstanceFromHub } from './actions/provision-instance'
export type { ProvisionInstanceInput, ProvisionResult, ProvisionStep } from './actions/provision-instance'
export { ProvisionInstanceModal } from './components/provision-instance-modal'
export { InstancesList } from './components/instances-list'
export { useInstances } from './hooks/use-instances'
export type { ClientInstance } from './hooks/use-instances'
export { exportClientData } from './actions/export-client-data'
export type { ExportClientDataInput, ExportResult, ExportStatus, DataExport } from './types/export.types'
export { transferInstanceToClient } from './actions/transfer-instance'
export type { TransferInstanceInput, TransferResult, TransferStatus, InstanceTransfer } from './types/transfer.types'
export { ActivityLogs } from './components/activity-logs'
export { MaintenanceMode } from './components/maintenance-mode'
export { ClientExportButton } from './components/client-export-button'
export { BackupStatus } from './components/backup-status'
export { triggerManualBackup } from './actions/trigger-backup'
export type { TriggerBackupResult } from './actions/trigger-backup'
export { useBackupStatus } from './hooks/use-backup-status'
export type { BackupEntry } from './hooks/use-backup-status'
export { toggleMaintenanceMode } from './actions/toggle-maintenance'
export type { MaintenanceToggleResult } from './actions/toggle-maintenance'
export { useActivityLogs } from './hooks/use-activity-logs'
export type { ActivityLog, ActivityLogsFilters } from './hooks/use-activity-logs'
export { useMaintenanceConfig } from './hooks/use-maintenance'
export type { MaintenanceConfig } from './hooks/use-maintenance'
export { SystemHealth } from './components/system-health'
export { WebhooksPlaceholder } from './components/webhooks-placeholder'
export { ApiPlaceholder } from './components/api-placeholder'
export { useSystemHealth } from './hooks/use-system-health'
export type { HealthCheckData, ServiceCheck, GlobalStatus, ServiceStatus } from './hooks/use-system-health'

// Module Catalog — Components (Story 13.5)
export { CatalogList } from './components/catalog-list'
export { CatalogFilters } from './components/catalog-filters'
export { ModuleEditModal } from './components/module-edit-modal'
export { GenerateQuoteFromModulesModal } from './components/generate-quote-from-modules-modal'
export { CatalogAnalyticsWidgets } from './components/catalog-analytics-widgets'

// Module Catalog — Actions (Story 13.5)
export { listModuleCatalog } from './actions/list-module-catalog'
export type { ModuleCatalogEntry, ListModuleCatalogFilters } from './actions/list-module-catalog'
export { upsertModuleCatalog } from './actions/upsert-module-catalog'
export type { UpsertModuleCatalogInput } from './actions/upsert-module-catalog'
export { deleteModuleCatalog } from './actions/delete-module-catalog'
export { syncModuleCatalogFromManifests } from './actions/sync-module-catalog-from-manifests'
export type { SyncResult } from './actions/sync-module-catalog-from-manifests'
export { toggleClientModule } from './actions/toggle-client-module'
export type { ToggleClientModuleResult } from './actions/toggle-client-module'
export { applyClientModuleConfig } from './actions/apply-client-module-config'
export type { ApplyConfigResult } from './actions/apply-client-module-config'
export { useModuleCatalog, useUpsertModuleCatalog, useDeleteModuleCatalog, useSyncModuleCatalog } from './hooks/use-module-catalog'
export { useClientModules, useToggleClientModule, useApplyClientModuleConfig } from './hooks/use-client-modules'
export { useCatalogAnalytics } from './hooks/use-catalog-analytics'
export type { CatalogAnalyticsEntry } from './hooks/use-catalog-analytics'

// Impersonation (Story 13.3)
export { startImpersonation } from './actions/start-impersonation'
export type { ImpersonationResult } from './actions/start-impersonation'
export { endImpersonation } from './actions/end-impersonation'
export type { EndImpersonationResult } from './actions/end-impersonation'
export { ImpersonationButton } from './components/impersonation-button'
export {
  IMPERSONATION_BLOCKED_ACTIONS,
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_MAX_DURATION_MS,
  isBlockedInImpersonation,
  type BlockedAction,
  type ImpersonationSessionData,
} from './utils/impersonation-guards'
