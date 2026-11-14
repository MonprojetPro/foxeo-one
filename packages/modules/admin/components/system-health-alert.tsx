'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { useSystemHealth } from '../hooks/use-system-health'

// Libellés alignés sur l'onglet Monitoring (SERVICE_DISPLAY de system-health.tsx).
const SERVICE_LABELS: Record<string, string> = {
  supabase_db: 'Supabase DB',
  supabase_storage: 'Supabase Storage',
  supabase_auth: 'Supabase Auth',
  supabase_realtime: 'Supabase Realtime',
  vercel_hub: 'App Hub (Vercel)',
  vercel_client: 'App Client (Vercel)',
  resend: 'Resend (emails)',
  pennylane: 'Pennylane API',
  cal_com: 'Cal.com',
}

/**
 * Bandeau d'alerte système sur l'accueil Hub.
 *
 * Ne s'affiche QUE si un service est réellement en panne (statut `error` : pas de
 * réponse, 5xx ou timeout). Un service simplement lent (`degraded`) n'allume plus
 * ce bandeau depuis le 2026-11-14 (T-091) : la lenteur reste visible dans l'onglet
 * Maintenance & Système, mais ne s'affiche plus comme une « alerte » sur l'accueil.
 * Se met à jour en Realtime (system_config est dans la publication).
 */
export function SystemHealthAlert() {
  const { data } = useSystemHealth()
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel('home-system-health')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'system_config', filter: 'key=eq.health_checks' },
        () => queryClient.invalidateQueries({ queryKey: ['system-config', 'health-checks'] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  if (!data || data.globalStatus !== 'error') return null

  const affected = Object.entries(data.services)
    .filter(([, c]) => c.status === 'error')
    .map(([key]) => ({ key, label: SERVICE_LABELS[key] ?? key }))

  if (affected.length === 0) return null

  return (
    <a
      href="/modules/admin/system"
      className="block rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 transition-colors hover:brightness-110"
      aria-label="Alerte système — voir le monitoring"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none" aria-hidden="true">🔴</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-300">
            Alerte système — service en panne
            {' '}
            <span className="opacity-80">({affected.length} concerné{affected.length > 1 ? 's' : ''})</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {affected.map((a) => (
              <span key={a.key} className="inline-flex items-center gap-1.5 text-xs text-gray-300">
                <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
                {a.label}
                <span className="text-gray-500">— panne</span>
              </span>
            ))}
          </div>
        </div>
        <span className="shrink-0 text-xs text-red-300 opacity-70">Voir le monitoring →</span>
      </div>
    </a>
  )
}
