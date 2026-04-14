'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@monprojetpro/ui'
import type { TypeCounts } from '../types/crm.types'

interface ClientTypeChartProps {
  data: TypeCounts
  total: number
}

const SEGMENTS = [
  { key: 'complet' as const, label: 'Complet (Lab)', color: 'var(--color-chart-1, #2563eb)' },
  { key: 'directOne' as const, label: 'Direct One', color: 'var(--color-chart-2, #16a34a)' },
  { key: 'ponctuel' as const, label: 'Ponctuel', color: 'var(--color-chart-3, #f59e0b)' },
] as const

function getPercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export function ClientTypeChart({ data, total }: ClientTypeChartProps) {
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Répartition par type</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun client</p>
        </CardContent>
      </Card>
    )
  }

  // Build segments for SVG donut
  const segments = SEGMENTS.map((seg) => ({
    ...seg,
    value: data[seg.key],
    percentage: getPercentage(data[seg.key], total),
  })).filter((seg) => seg.value > 0)

  // SVG donut chart offsets
  let cumulativePercentage = 0
  const donutSegments = segments.map((seg) => {
    const offset = cumulativePercentage
    cumulativePercentage += seg.percentage
    return { ...seg, offset }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Répartition par type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* SVG Donut */}
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
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{total}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {SEGMENTS.map((seg) => (
              <div key={seg.key} className="flex items-center gap-2 text-sm">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                  data-testid={`legend-${seg.key}`}
                />
                <span className="text-muted-foreground">{seg.label}</span>
                <span className="font-medium ml-auto">
                  {data[seg.key]} ({getPercentage(data[seg.key], total)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
