import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@monprojetpro/types'
import { getRequiredEnv } from '@monprojetpro/utils'
import type { CookieToSet } from './cookie-types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — setAll not available
          }
        },
      },
    }
  )
}
