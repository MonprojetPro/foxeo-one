import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@monprojetpro/types'

// NEXT_PUBLIC_* must be referenced as literal strings for Next.js to inline them at build time.
// Using process.env[key] dynamically does NOT work in the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
    )
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
