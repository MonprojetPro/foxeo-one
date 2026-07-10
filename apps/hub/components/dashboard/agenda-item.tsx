import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface AgendaItemProps {
  time: string
  title: string
  detail?: string
  actionLabel?: string
  actionHref?: string
  badgeText?: string
}

export function AgendaItem({ time, title, detail, actionLabel, actionHref, badgeText }: AgendaItemProps) {
  return (
    <div className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <span className="w-12 shrink-0 text-sm font-medium tabular-nums text-cyan-300">{time}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-gray-100">{title}</p>
        {detail && <p className="truncate text-xs text-gray-500">{detail}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="shrink-0 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20"
          onClick={(e) => e.stopPropagation()}
        >
          {actionLabel}
        </Link>
      )}
      {badgeText && (
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {badgeText}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}
