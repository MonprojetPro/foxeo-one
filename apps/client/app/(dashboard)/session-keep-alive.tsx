'use client'

import { useEffect } from 'react'

// Ping serveur toutes les 4 minutes pour maintenir la session active.
// Le middleware Supabase gère le refresh du JWT côté serveur lors de ce ping.
// On évite volontairement de créer un browser Supabase client ici :
// si plusieurs instances coexistent (hooks TanStack, Realtime...), elles peuvent
// tenter de rafraîchir le refresh token simultanément → Supabase détecte la
// réutilisation et invalide la session (logout forcé en quelques minutes).
export function SessionKeepAlive() {
  useEffect(() => {
    const ping = () => fetch('/api/session-ping', { credentials: 'same-origin' })

    const interval = setInterval(ping, 4 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  return null
}
