'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Bascule INSTANTANÉE du mode maintenance côté client, sans rechargement manuel.
 *
 * Écoute les UPDATE de system_config (clé maintenance_mode) en Realtime :
 *  - maintenance activée  → le client (hors /maintenance) est envoyé sur /maintenance
 *  - maintenance coupée    → le client posé sur /maintenance est renvoyé sur /
 *
 * On utilise une navigation « dure » (window.location) volontairement : elle force le
 * passage par le middleware serveur (qui porte la logique opérateur/redirection) et évite
 * les échecs de redirection en soft-nav RSC déjà constatés sur ce projet.
 *
 * Monté à deux endroits : le layout (dashboard) (sens activation) et la page /maintenance
 * (sens désactivation). Le composant est path-aware, le même code gère les deux.
 */
export function MaintenanceRealtimeGuard() {
  const pathname = usePathname()
  // Ref pour lire le pathname courant sans re-souscrire à chaque navigation.
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    const channel = supabase
      .channel('system-config-maintenance')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_config',
          filter: 'key=eq.maintenance_mode',
        },
        (payload) => {
          const value = (payload.new as { value?: unknown } | null)?.value
          const enabled = value === true
          const current = pathnameRef.current

          if (enabled && current !== '/maintenance') {
            window.location.href = '/maintenance'
          } else if (!enabled && current === '/maintenance') {
            window.location.href = '/'
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[MAINTENANCE:REALTIME] Channel error:', err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}
