/**
 * @monprojetpro/supabase - Supabase clients, providers et helpers pour MonprojetPro One
 */

// Clients
export { createClient } from './client'
export { createClient as createBrowserSupabaseClient } from './client'
export { createServerSupabaseClient } from './server'
export { createMiddlewareSupabaseClient } from './middleware'

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
export { hasIaConsent, getLatestConsents } from './queries/get-consent'
