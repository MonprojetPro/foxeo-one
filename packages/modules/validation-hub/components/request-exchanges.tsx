'use client'

import { CockpitPanel } from '@monprojetpro/ui'
import { formatFullDate } from '@monprojetpro/utils'

export type ExchangeEntry = {
  date: string
  actor: 'MiKL' | 'Client'
  action: string
  comment?: string
}

type RequestExchangesProps = {
  exchanges: ExchangeEntry[]
}

export function RequestExchanges({ exchanges }: RequestExchangesProps) {
  if (exchanges.length === 0) {
    return null
  }

  // Tri chronologique (plus ancien en premier)
  const sorted = [...exchanges].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <CockpitPanel title="Échanges" tone="blue">
      <div className="p-3">
        <div className="relative space-y-0">
          {sorted.map((entry, index) => (
            <ExchangeItem
              key={index}
              entry={entry}
              isLast={index === sorted.length - 1}
            />
          ))}
        </div>
      </div>
    </CockpitPanel>
  )
}

// ── Item — entrée de la timeline d'échanges ───────────────────────────────

function ExchangeItem({
  entry,
  isLast,
}: {
  entry: ExchangeEntry
  isLast: boolean
}) {
  const isMiKL = entry.actor === 'MiKL'

  return (
    <div className="flex gap-3">
      {/* Ligne de timeline */}
      <div className="flex flex-col items-center">
        <div
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
            isMiKL ? 'bg-cyan-400' : 'bg-gray-500'
          }`}
        />
        {!isLast && <div className="mt-1 w-px flex-1 bg-white/10" />}
      </div>

      {/* Contenu */}
      <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
        <div className="flex flex-wrap items-baseline gap-1.5 text-xs">
          <span className="text-gray-500 tabular-nums">
            {formatFullDate(entry.date)}
          </span>
          <span
            className={`font-medium ${isMiKL ? 'text-cyan-300' : 'text-gray-200'}`}
          >
            {entry.actor}
          </span>
          <span className="text-gray-400">{entry.action}</span>
        </div>
        {entry.comment && (
          <p className="mt-1 rounded-xl bg-white/[0.03] p-2 text-sm text-gray-300">
            {entry.comment}
          </p>
        )}
      </div>
    </div>
  )
}
