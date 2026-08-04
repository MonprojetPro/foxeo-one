import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@monprojetpro/types'
import type { CookieToSet } from './cookie-types'
import {
  useSessionCookies,
  serializeBrowserCookie,
  parseBrowserCookies,
} from './session-cookies'

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
  // Sans adaptateur, @supabase/ssr réécrit les cookies avec 400 jours de durée de vie
  // à chaque rafraîchissement de jeton — ce qui annulerait « fermer le navigateur
  // déconnecte » quelques minutes après la connexion. On ne prend la main sur
  // document.cookie que sur les déploiements concernés (le Hub) ; ailleurs, on laisse
  // la bibliothèque faire son travail habituel.
  if (!useSessionCookies()) {
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseBrowserCookies(document.cookie)
      },
      setAll(cookiesToSet: CookieToSet[]) {
        const isSecureContext = window.location.protocol === 'https:'
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = serializeBrowserCookie(name, value, options, isSecureContext)
        })
      },
    },
  })
}
