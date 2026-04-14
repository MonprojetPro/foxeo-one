'use client'

import { Badge, Switch } from '@monprojetpro/ui'
import type { NotificationType } from '../types/notification.types'

interface PrefToggleRowProps {
  label: string
  description: string
  notificationType: NotificationType
  channelEmail: boolean
  channelInapp: boolean
  isCriticalInapp: boolean
  onToggleEmail: (value: boolean) => void
  onToggleInapp: (value: boolean) => void
}

export function PrefToggleRow({
  label,
  description,
  notificationType,
  channelEmail,
  channelInapp,
  isCriticalInapp,
  onToggleEmail,
  onToggleInapp,
}: PrefToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6 shrink-0">
        {/* Email toggle */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">Email</span>
          <Switch
            data-testid={`toggle-email-${notificationType}`}
            checked={channelEmail}
            onCheckedChange={onToggleEmail}
          />
        </div>

        {/* In-app toggle */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">In-app</span>
          {isCriticalInapp ? (
            <div className="flex flex-col items-center gap-1">
              <Switch
                data-testid={`toggle-inapp-${notificationType}`}
                checked={true}
                disabled={true}
                data-disabled="true"
                aria-disabled="true"
              />
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Critique
              </Badge>
            </div>
          ) : (
            <Switch
              data-testid={`toggle-inapp-${notificationType}`}
              checked={channelInapp}
              onCheckedChange={onToggleInapp}
            />
          )}
        </div>
      </div>
    </div>
  )
}
