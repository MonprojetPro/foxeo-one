/**
 * @monprojetpro/ui - Composants UI partagés pour MonprojetPro One
 * Basé sur shadcn/ui + Radix UI
 */

// Hooks
export * from './use-mobile'
export { useOnline } from './hooks/use-online'
export { useConfirmDialog } from './hooks/use-confirm-dialog'
export { useOptimisticLock } from './hooks/use-optimistic-lock'
export { useTranslations } from './hooks/use-translations'

// Providers
export { LocaleProvider } from './providers/locale-provider'

// Composants
export * from './avatar'
export * from './scroll-area'
export * from './alert'
export * from './alert-dialog'
export * from './badge'
export * from './button'
export * from './card'
export * from './checkbox'
export * from './dialog'
export * from './input'
export * from './select'
export * from './separator'
export * from './sheet'
export * from './sidebar'
export * from './skeleton'
export * from './switch'
export * from './tabs'
export * from './textarea'
export * from './tooltip'
export * from './form'
export * from './popover'
export * from './calendar'
export * from './label'
export * from './dropdown-menu'
export { toast } from 'sonner'

// Dashboard components
export { DashboardShell } from './components/dashboard-shell'
export { ShellSkeleton } from './components/shell-skeleton'
export { ModuleSkeleton } from './components/module-skeleton'
export { ModuleSidebar } from './components/module-sidebar'
export { EmptyState } from './components/empty-state'
export { EMPTY_SEARCH, EMPTY_LIST, EMPTY_ERROR } from './components/empty-state-presets'
export { ThemeToggle } from './components/theme-toggle'
export { ModeToggle, MODE_TOGGLE_COOKIE, type ModeToggleProps } from './components/mode-toggle'
export { DataTable, type ColumnDef, type DataTableProps } from './components/data-table'

// Breadcrumb
export * from './components/breadcrumb'

// Error display
export { ErrorDisplay, type ErrorDisplayProps } from './components/error-display'

// Offline banner
export { OfflineBanner } from './components/offline-banner'

// Browser warning
export { BrowserWarning } from './components/browser-warning'

// Toast
export { Toaster } from './components/sonner'
export * from './components/toast-utils'

// Consent
export { ConsentCheckbox } from './components/consent-checkbox'

// Conflict
export { ConflictDialog, type ConflictDialogProps } from './components/conflict-dialog'
