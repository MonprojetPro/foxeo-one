'use client'

import type { TypeCounts } from '../types/crm.types'

interface ClientTypeChartProps {
  data: TypeCounts
  total: number
}

// Teintes cockpit pour chaque segment du donut
const SEGMENTS = [
  { key: 'complet' as const, label: 'Complet (Lab)', color: '#22d3ee' },   // cyan-400
  { key: 'directOne' as const, label: 'Direct One', color: '#4ade80' },    // green-400
  { key: 'ponctuel' as const, label: 'Ponctuel', color: '#fbbf24' },       // amber-400
] as const

function getPercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export function ClientTypeChart({ data, total }: ClientTypeChartProps) {
  // État vide — cockpit style
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Répartition par type
        </p>
        <p className="text-sm text-gray-500">Aucun client</p>
      </div>
    )
  }

  // Build segments for SVG donut — logique inchangée
  const segments = SEGMENTS.map((seg) => ({
    ...seg,
    value: data[seg.key],
    percentage: getPercentage(data[seg.key], total),
  })).filter((seg) => seg.value > 0)

  // SVG donut chart offsets — logique inchangée
  let cumulativePercentage = 0
  const donutSegments = segments.map((seg) => {
    const offset = cumulativePercentage
    cumulativePercentage += seg.percentage
    return { ...seg, offset }
  })

  return (
    /* Panneau cockpit sombre */
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500 mb-4">
        Répartition par type
      </p>
      <div className="flex items-center gap-8">
        {/* SVG Donut — inchangé */}
        <div className="relative h-32 w-32 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            {donutSegments.map((seg) => (
              <circle
                key={seg.key}
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke={seg.color}
                strokeWidth="3"
                strokeDasharray={`${seg.percentage} ${100 - seg.percentage}`}
                strokeDashoffset={`${-seg.offset}`}
                data-testid={`donut-segment-${seg.key}`}
              />
            ))}
          </svg>
          {/* Total centré — tabular-nums */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold tabular-nums text-white">{total}</span>
          </div>
        </div>

        {/* Légende cockpit */}
        <div className="space-y-2">
          {SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex items-center gap-2 text-sm">
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
                data-testid={`legend-${seg.key}`}
              />
              <span className="text-gray-400">{seg.label}</span>
              <span className="tabular-nums text-white font-medium ml-auto">
                {data[seg.key]} ({getPercentage(data[seg.key], total)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
