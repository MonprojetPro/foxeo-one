'use client'

import { showInfo } from '@monprojetpro/ui'

export function notifyToast(title: string, body?: string | null) {
  showInfo(body ? `${title}: ${body}` : title)
}

// Re-export as component for consistency with manifest
export function NotificationToast() {
  return null
}

NotificationToast.displayName = 'NotificationToast'
