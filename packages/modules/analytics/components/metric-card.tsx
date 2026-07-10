'use client'

/* Aligné sur le style cockpit Hub — délègue à StatCard de @monprojetpro/ui.
   On conserve les mêmes props pour ne pas casser les usages existants. */
import { StatCard } from '@monprojetpro/ui'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export function MetricCard({ label, value, sub, accent = false }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <StatCard label={label} value={value} accent={accent} tone="cyan" />
      {sub && <p className="text-[0.7rem] text-gray-500 px-1">{sub}</p>}
    </div>
  )
}
