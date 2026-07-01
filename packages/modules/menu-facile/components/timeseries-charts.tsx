'use client'

import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LineChart as LineChartIcon, Clock } from 'lucide-react'
import { useMenuFacileTimeseries } from '../hooks/use-menu-facile-timeseries'

const WINDOWS = [7, 30, 90] as const

const COLORS = {
  cyan: '#22d3ee',
  violet: '#a78bfa',
  emerald: '#34d399',
}

const GRID = 'rgba(255,255,255,0.06)'
const AXIS = '#6b7280'

function fmtTick(d: string): string {
  const parts = d.split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d
}

function fmtFullDate(d: string): string {
  const date = new Date(d)
  return Number.isNaN(date.getTime())
    ? d
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const TOOLTIP_STYLE = {
  background: '#0b0f0e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.5rem',
  fontSize: '12px',
} as const

/** Cadre commun d'un graphique (titre + hauteur fixe). */
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-200">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="h-[200px] w-full">{children}</div>
    </div>
  )
}

/** Encart « en attente de données » (ex : DAU/sessions pas encore trackés). */
function AwaitingCard({
  title,
  icon: Icon,
  message,
}: {
  title: string
  icon: typeof Clock
  message: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-4 text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-gray-300">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-gray-500">{message}</p>
    </div>
  )
}

export function TimeseriesCharts() {
  const [days, setDays] = useState<number>(30)
  const { data, isLoading, error } = useMenuFacileTimeseries(days)

  const series = data?.series ?? []
  const hasActive = series.some((p) => (p.active_users ?? 0) > 0)
  const hasSession = series.some((p) => p.avg_session_minutes != null)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-4 w-4 text-cyan-300" />
          <h2 className="text-sm font-semibold text-gray-200">Évolution</h2>
        </div>
        <div className="flex gap-1.5">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setDays(w)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                days === w
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                  : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              {w} j
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6 text-center">
          <p className="text-sm text-amber-200">Les graphiques s&apos;afficheront dès que le guichet renverra les séries.</p>
          <p className="mt-1 text-xs text-gray-500">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="h-[248px] rounded-2xl bg-white/5 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-[248px] rounded-2xl bg-white/5 animate-pulse" />
            <div className="h-[248px] rounded-2xl bg-white/5 animate-pulse" />
          </div>
        </div>
      ) : !series.length ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center text-sm text-gray-400">
          Aucune donnée sur la période sélectionnée.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Nouveaux comptes par jour */}
          <ChartCard title="Nouveaux comptes par jour">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="mfNewUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtTick} stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#fff' }} labelFormatter={fmtFullDate} cursor={{ stroke: GRID }} />
                <Area type="monotone" dataKey="new_users" name="Nouveaux comptes" stroke={COLORS.cyan} strokeWidth={2} fill="url(#mfNewUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* DAU (Priorité 2 — s'affiche seulement si tracké) */}
            {hasActive ? (
              <ChartCard title="Utilisateurs actifs par jour" subtitle="DAU — visiteurs uniques quotidiens">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtTick} stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#fff' }} labelFormatter={fmtFullDate} cursor={{ stroke: GRID }} />
                    <Line type="monotone" dataKey="active_users" name="Actifs" stroke={COLORS.emerald} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : (
              <AwaitingCard
                title="Utilisateurs actifs par jour (DAU)"
                icon={LineChartIcon}
                message="En attente du tracking d'activité côté MenuFacile — les données s'accumuleront jour après jour dès qu'il sera actif."
              />
            )}

            {/* Copies de recettes par jour */}
            <ChartCard title="Copies de recettes par jour">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtTick} stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#fff' }} labelFormatter={fmtFullDate} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="recipe_copies" name="Copies" fill={COLORS.violet} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Temps passé moyen (Priorité 3 — seulement si fourni) */}
          {hasSession && (
            <ChartCard title="Temps passé moyen par jour" subtitle="minutes par session">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtTick} stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#fff' }} labelFormatter={fmtFullDate} cursor={{ stroke: GRID }} />
                  <Line type="monotone" dataKey="avg_session_minutes" name="Min/session" stroke={COLORS.cyan} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </section>
  )
}
