import { cn } from '@monprojetpro/utils'

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  accentColor?: 'primary' | 'destructive' | 'muted'
}

/**
 * Carte métrique compacte — style « cockpit » (verre sur fond noir profond).
 * Le liseré supérieur teinté conserve le repère visuel de l'accent.
 */
export function MetricCard({ title, value, subtitle, accentColor = 'muted' }: MetricCardProps) {
  const accent = {
    primary: { top: 'border-t-cyan-400/50', value: 'text-white', glow: 'bg-cyan-400/10' },
    destructive: { top: 'border-t-red-400/50', value: 'text-red-200', glow: 'bg-red-400/10' },
    muted: { top: 'border-t-white/15', value: 'text-white', glow: 'bg-white/5' },
  }[accentColor]

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 border-t-2 bg-white/[0.025] p-4 transition-all duration-200 hover:bg-white/[0.04]',
        accent.top,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-90',
          accent.glow,
        )}
      />
      <p className="relative text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </p>
      <p className={cn('relative mt-1 text-2xl font-semibold tabular-nums tracking-tight', accent.value)}>
        {value}
      </p>
      <p className="relative mt-0.5 text-xs text-gray-500">{subtitle}</p>
    </div>
  )
}
