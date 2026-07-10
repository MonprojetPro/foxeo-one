import { cn } from '@monprojetpro/utils'

export type StatusDotState = 'live' | 'loading' | 'error' | 'idle'

const STATE_CONFIG: Record<
  StatusDotState,
  { dot: string; ring: string; text: string; pulse: boolean }
> = {
  live: { dot: 'bg-emerald-400', ring: 'bg-emerald-400/40', text: 'text-emerald-300/90', pulse: true },
  loading: { dot: 'bg-amber-400', ring: 'bg-amber-400/40', text: 'text-amber-300/90', pulse: true },
  error: { dot: 'bg-red-400', ring: 'bg-red-400/40', text: 'text-red-300/90', pulse: false },
  idle: { dot: 'bg-gray-400', ring: 'bg-gray-400/40', text: 'text-gray-400', pulse: false },
}

export interface StatusPillProps {
  state: StatusDotState
  label: string
  className?: string
}

/**
 * Pastille de statut « live » — point coloré (avec halo pulsant) + libellé,
 * dans une capsule bordée. Reprend l'indicateur de guichet de MenuFacile.
 */
export function StatusPill({ state, label, className }: StatusPillProps) {
  const c = STATE_CONFIG[state]
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5',
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        {c.pulse && (
          <span
            className={cn('absolute inline-flex h-full w-full animate-ping rounded-full', c.ring)}
          />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', c.dot)} />
      </span>
      <span className={cn('text-xs font-medium', c.text)}>{label}</span>
    </div>
  )
}
