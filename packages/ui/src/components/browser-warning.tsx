'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { t } from '@monprojetpro/utils'
// Ensure messages are loaded
import '../messages/init'

function detectBrowser() {
  if (typeof window === 'undefined') return { supported: true, name: 'unknown' }

  const ua = navigator.userAgent

  // Chrome
  if (ua.includes('Chrome/') && !ua.includes('Edg/') && !ua.includes('OPR/')) {
    const version = parseInt(ua.match(/Chrome\/(\d+)/)?.[1] || '0')
    return { supported: version >= 90, name: 'Chrome', version }
  }

  // Edge
  if (ua.includes('Edg/')) {
    const version = parseInt(ua.match(/Edg\/(\d+)/)?.[1] || '0')
    return { supported: version >= 90, name: 'Edge', version }
  }

  // Firefox
  if (ua.includes('Firefox/')) {
    const version = parseInt(ua.match(/Firefox\/(\d+)/)?.[1] || '0')
    return { supported: version >= 90, name: 'Firefox', version }
  }

  // Safari
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const version = parseInt(ua.match(/Version\/(\d+)/)?.[1] || '0')
    return { supported: version >= 15, name: 'Safari', version }
  }

  // Unknown browser
  return { supported: false, name: 'inconnu' }
}

export function BrowserWarning() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('monprojetpro-browser-warning-dismissed')
    if (wasDismissed) {
      setDismissed(true)
      return
    }

    const browser = detectBrowser()
    if (!browser.supported) {
      setDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('monprojetpro-browser-warning-dismissed', 'true')
    setDismissed(true)
  }

  if (dismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 dark:bg-yellow-600/90 px-4 py-3 text-center text-sm text-yellow-950">
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>{t('browserWarning.message')}</span>
        <button
          onClick={handleDismiss}
          className="ml-2 flex-shrink-0 rounded p-1 hover:bg-yellow-600/20"
          aria-label={t('browserWarning.dismissButton')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
