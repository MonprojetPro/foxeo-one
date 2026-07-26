/**
 * @monprojetpro/supabase - Supabase clients, providers et helpers pour MonprojetPro One
 */

// Clients
export { createClient } from './client'
export { createClient as createBrowserSupabaseClient } from './client'
export { createServerSupabaseClient } from './server'
export { createServiceRoleSupabaseClient } from './service-role'
export { createMiddlewareSupabaseClient } from './middleware'

// Journal d'activité — attribution de l'acteur (impersonation incluse)
export { resolveLogActor } from './impersonation-actor'

// Espace figé — client qui a résilié (lecture seule sur le parcours)
export {
  READ_ONLY_CLIENT_STATUSES,
  READ_ONLY_ERROR_CODE,
  READ_ONLY_ERROR_MESSAGE,
  isReadOnlyClientStatus,
  readOnlyError,
  checkClientWriteAllowed,
  type ReadOnlyClientStatus,
} from './read-only-guard'

// Realtime
export {
  CHANNEL_PATTERNS,
  subscribeToChanges,
  type ChannelEvent,
} from './realtime'

// Providers
export { QueryProvider } from './providers/query-provider'
export { RealtimeProvider, useRealtime } from './providers/realtime-provider'
export { ThemeProvider, useTheme } from './providers/theme-provider'

// Queries
export { hasIaConsent, getLatestConsents, getConsentHistory } from './queries/get-consent'
