'use client'

import { Card, CardContent, CardHeader } from '@monprojetpro/ui'
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

  // Sort chronologically (oldest first)
  const sorted = [...exchanges].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Échanges
        </h2>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative space-y-0">
          {sorted.map((entry, index) => (
            <ExchangeItem
              key={index}
              entry={entry}
              isLast={index === sorted.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

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
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${
            isMiKL ? 'bg-primary' : 'bg-muted-foreground'
          }`}
        />
        {!isLast && <div className="w-px flex-1 bg-border/50 mt-1" />}
      </div>

      {/* Content */}
      <div className={`pb-4 flex-1 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex flex-wrap items-baseline gap-1.5 text-xs">
          <span className="text-muted-foreground">
            {formatFullDate(entry.date)}
          </span>
          <span
            className={`font-medium ${isMiKL ? 'text-primary' : 'text-foreground'}`}
          >
            {entry.actor}
          </span>
          <span className="text-muted-foreground">{entry.action}</span>
        </div>
        {entry.comment && (
          <p className="mt-1 text-sm text-foreground/80 bg-muted/20 rounded p-2">
            {entry.comment}
          </p>
        )}
      </div>
    </div>
  )
}
