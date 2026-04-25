'use client'

import { useEffect } from 'react'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

// Rafraîchit silencieusement la session toutes les 14 minutes.
// Empêche la déconnexion forcée quand l'utilisateur reste sur une page sans naviguer
// (le middleware ne peut rafraîchir le JWT que lors des navigations).
export function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const interval = setInterval(async () => {
      await supabase.auth.refreshSession()
    }, 14 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  return null
}
