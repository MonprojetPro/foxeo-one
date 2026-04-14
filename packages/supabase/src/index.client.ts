/**
 * @monprojetpro/supabase - Client-safe exports (no next/headers dependency)
 * Server Components use the full index.ts via react-server condition.
 */

// Clients (browser only)
export { createClient } from './client'
export { createClient as createBrowserSupabaseClient } from './client'

// Stubs for server-only functions (will throw if called client-side)
export function createServerSupabaseClient(): never {
  throw new Error('createServerSupabaseClient cannot be used in client components. Import from @monprojetpro/supabase/server instead.')
}
export function createMiddlewareSupabaseClient(): never {
  throw new Error('createMiddlewareSupabaseClient cannot be used in client components. Import from @monprojetpro/supabase/middleware instead.')
}

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

// Queries (server-only — stubs)
export function hasIaConsent(): never {
  throw new Error('hasIaConsent cannot be used in client components.')
}
export function getLatestConsents(): never {
  throw new Error('getLatestConsents cannot be used in client components.')
}
