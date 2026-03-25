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
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent/50 transition-colors group cursor-pointer">
      <span className="text-sm font-medium text-primary w-12 shrink-0">{time}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{title}</p>
        {detail && <p className="text-xs text-muted-foreground truncate">{detail}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="shrink-0 rounded-sm bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/25 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {actionLabel}
        </Link>
      )}
      {badgeText && (
        <span className="shrink-0 flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {badgeText}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  )
}
