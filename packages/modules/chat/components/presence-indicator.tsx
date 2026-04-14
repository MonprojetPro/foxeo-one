import type { HTMLAttributes } from 'react'
import { cn } from '@monprojetpro/utils'

interface PresenceIndicatorProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'role'> {
  status: 'online' | 'offline'
}

/**
 * Visual presence dot — green when online, gray when offline.
 * AC3, AC4: Used in ChatWindow header and ChatList items.
 */
export function PresenceIndicator({ status, className, ...rest }: PresenceIndicatorProps) {
  const label = status === 'online' ? 'En ligne' : 'Hors ligne'

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid="presence-dot"
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full shrink-0',
        status === 'online' ? 'bg-green-500' : 'bg-gray-400',
        className
      )}
      {...rest}
    />
  )
}
