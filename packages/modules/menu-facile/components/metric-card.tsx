'use client'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

/**
 * Carte KPI secondaire locale au module (les modules ne s'importent pas entre eux).
 * Style aligné sur le cockpit Hub (dark, accent cyan) + micro-interaction au survol.
 */
export function MetricCard({ label, value, sub, accent = false }: MetricCardProps) {
  return (
    <div
      className={`group rounded-xl border px-4 py-3.5 transition-colors ${
        accent
          ? 'border-cyan-400/30 bg-cyan-400/[0.07] hover:bg-cyan-400/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
      }`}
    >
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
