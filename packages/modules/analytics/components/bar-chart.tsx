'use client'

/* Graphique en barres horizontales — style cockpit Hub.
   Barres en cyan avec piste sombre (white/5), grille implicite via l'alignement. */

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
      /* État vide cockpit — bordure pointillée discrète */
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 py-8">
        <p className="text-xs text-gray-500">Aucune donnée pour cette période</p>
      </div>
    )
  }

  const max = Math.max(...items.map((d) => d.value), 1)

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = Math.round((item.value / max) * 100)
        return (
          <div key={item.label} className="flex items-center gap-3">
            {/* Label tronqué, aligné à droite sur largeur fixe */}
            <span className="w-24 shrink-0 truncate text-right text-xs text-gray-500">{item.label}</span>
            {/* Piste de barre — fond white/5, accent cyan */}
            <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-400/60 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Valeur en chiffres tabulaires */}
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-gray-400">{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}
