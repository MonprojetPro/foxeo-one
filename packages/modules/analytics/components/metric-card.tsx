'use client'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export function MetricCard({ label, value, sub, accent = false }: MetricCardProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        accent
          ? 'border-cyan-400/30 bg-cyan-400/5'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
