import { cn } from '@monprojetpro/utils'

interface PresenceDotProps {
  isOnline: boolean
  clientId: string
}

/**
 * Minimal presence indicator for CRM client list.
 * AC4 (Story 3.5): Point de présence à côté du nom du client.
 * Intentionally minimal — no chat module import.
 */
export function PresenceDot({ isOnline, clientId }: PresenceDotProps) {
  const label = isOnline ? 'En ligne' : 'Hors ligne'

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid={`presence-dot-${clientId}`}
      className={cn(
        'inline-block h-2 w-2 rounded-full shrink-0',
        isOnline ? 'bg-green-500' : 'bg-gray-300'
      )}
    />
  )
}
