'use client'

interface BarChartItem {
  label: string
  value: number
}

interface BarChartProps {
  data: BarChartItem[]
  maxBars?: number
}

export function BarChart({ data, maxBars = 8 }: BarChartProps) {
  const items = data.slice(0, maxBars)

  if (items.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-4 text-center">Aucune donnée pour cette période</p>
    )
  }

  const max = Math.max(...items.map((d) => d.value), 1)

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = Math.round((item.value / max) * 100)
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-24 text-xs text-gray-400 truncate text-right">{item.label}</span>
            <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden">
              <div
                className="h-full rounded bg-cyan-400/60 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-xs text-gray-400 text-right">{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}
