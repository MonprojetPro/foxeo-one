'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  ShieldAlert,
  ChefHat,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react'
import { useMenuFacileMetrics } from '../hooks/use-menu-facile-metrics'
import { MetricsTab } from './metrics-tab'
import { ModerationTab } from './moderation-tab'
import { RecipesTab } from './recipes-tab'
import { MessagesTab } from './messages-tab'

type TabKey = 'metrics' | 'moderation' | 'recipes' | 'messages'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'metrics', label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'moderation', label: 'Modération', icon: ShieldAlert },
  { key: 'recipes', label: 'Recettes officielles', icon: ChefHat },
  { key: 'messages', label: 'Messages', icon: MessagesSquare },
]

/** Point de statut du guichet admin-api (live / injoignable / connexion). */
function GuichetStatus({
  state,
}: {
  state: 'loading' | 'connected' | 'error'
}) {
  const config = {
    loading: { dot: 'bg-amber-400', ring: 'bg-amber-400/40', label: 'Connexion au guichet…', text: 'text-amber-300/90' },
    connected: { dot: 'bg-emerald-400', ring: 'bg-emerald-400/40', label: 'Guichet connecté', text: 'text-emerald-300/90' },
    error: { dot: 'bg-red-400', ring: 'bg-red-400/40', label: 'Guichet injoignable', text: 'text-red-300/90' },
  }[state]

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        {state !== 'error' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.ring}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.dot}`} />
      </span>
      <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
    </div>
  )
}

/** Pastille compteur affichée sur un onglet (signalements / messages à traiter). */
function TabCount({ count, tone }: { count: number; tone: 'amber' | 'cyan' }) {
  if (count <= 0) return null
  const cls =
    tone === 'amber'
      ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30'
      : 'bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-400/30'
  return (
    <span
      className={`ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[0.7rem] font-semibold tabular-nums ${cls}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/**
 * Cockpit MenuFacile — page unique à onglets (Tableau de bord / Modération / Recettes / Messages).
 * Toute la donnée passe par les Server Actions → guichet admin-api de MenuFacile.
 * Le header réutilise `useMenuFacileMetrics` (même queryKey → pas de double appel) pour
 * afficher le statut du guichet + les compteurs live sur les onglets.
 */
export function MenuFacileDashboard() {
  const [tab, setTab] = useState<TabKey>('metrics')
  const { data, isLoading, error } = useMenuFacileMetrics()

  const status: 'loading' | 'connected' | 'error' = error
    ? 'error'
    : isLoading
      ? 'loading'
      : 'connected'

  const reportsPending = data?.moderation.reports_pending ?? 0
  const messagesNew = data?.contact?.new ?? 0
  const totalAlerts = reportsPending + messagesNew

  return (
    <div className="space-y-6">
      {/* ── Header cockpit ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-cyan-400/[0.06] to-transparent px-5 py-5 sm:px-6">
        {/* Glow décoratif */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_-8px] shadow-cyan-400/50">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">MenuFacile</h1>
              <p className="text-sm text-gray-400">
                Cockpit d&apos;administration du produit — piloté via le guichet sécurisé
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:pt-1">
            {totalAlerts > 0 && (
              <span className="hidden items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 sm:inline-flex">
                {totalAlerts} à traiter
              </span>
            )}
            <GuichetStatus state={status} />
          </div>
        </div>
      </div>

      {/* ── Navigation à pills + compteurs live ────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isActive = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-white shadow-[0_0_20px_-6px] shadow-cyan-400/50'
                  : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-300' : 'text-gray-500 group-hover:text-gray-300'
                }`}
              />
              <span>{t.label}</span>
              {t.key === 'moderation' && <TabCount count={reportsPending} tone="amber" />}
              {t.key === 'messages' && <TabCount count={messagesNew} tone="cyan" />}
            </button>
          )
        })}
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────── */}
      {tab === 'metrics' && <MetricsTab onNavigate={setTab} />}
      {tab === 'moderation' && <ModerationTab />}
      {tab === 'recipes' && <RecipesTab />}
      {tab === 'messages' && <MessagesTab />}
    </div>
  )
}
