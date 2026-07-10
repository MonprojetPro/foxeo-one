import type { HTMLAttributes } from 'react'
import { cn } from '@monprojetpro/utils'

interface PresenceIndicatorProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'role'> {
  status: 'online' | 'offline'
}

/**
 * Indicateur de présence cockpit — point coloré avec halo pulsant quand en ligne.
 * AC3, AC4 : utilisé dans le header ChatWindow et les items ChatList.
 */
export function PresenceIndicator({ status, className, ...rest }: PresenceIndicatorProps) {
  const label = status === 'online' ? 'En ligne' : 'Hors ligne'

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid="presence-dot"
      className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', className)}
      {...rest}
    >
      {/* Halo pulsant — uniquement quand en ligne */}
      {status === 'online' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
      )}
      {/* Point central */}
      <span
        className={cn(
          'relative inline-flex h-2.5 w-2.5 rounded-full',
          status === 'online' ? 'bg-emerald-400' : 'bg-white/20'
        )}
      />
    </span>
  )
}
