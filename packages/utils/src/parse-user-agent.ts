/**
 * User-agent parsing utilities — Story 1.6
 *
 * Lightweight parser without external dependencies.
 * Extracts browser, OS, and device type from user-agent strings.
 */

import type { DeviceType } from '@monprojetpro/types'

export type { DeviceType } from '@monprojetpro/types'
export type { SessionInfo } from '@monprojetpro/types'

export interface ParsedUserAgent {
  browser: string
  os: string
  deviceType: DeviceType
  rawUserAgent: string
}

/**
 * Parse a user-agent string to extract browser, OS, and device type.
 *
 * Order matters for browser detection:
 * - Edge contains "Chrome" and "Safari"
 * - Chrome contains "Safari"
 * - Opera contains "Chrome" and "Safari"
 */
export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent || ''

  return {
    browser: detectBrowser(ua),
    os: detectOs(ua),
    deviceType: detectDeviceType(ua),
    rawUserAgent: ua,
  }
}

function detectBrowser(ua: string): string {
  // Edge (Chromium-based) — must check before Chrome
  const edgeMatch = ua.match(/Edg(?:e|A|iOS)?\/(\d+)/)
  if (edgeMatch) return `Edge ${edgeMatch[1]}`

  // Opera / OPR — must check before Chrome
  const operaMatch = ua.match(/(?:OPR|Opera)\/(\d+)/)
  if (operaMatch) return `Opera ${operaMatch[1]}`

  // Firefox
  const firefoxMatch = ua.match(/Firefox\/(\d+)/)
  if (firefoxMatch) return `Firefox ${firefoxMatch[1]}`

  // Samsung Browser — must check before Chrome
  const samsungMatch = ua.match(/SamsungBrowser\/(\d+)/)
  if (samsungMatch) return `Samsung Browser ${samsungMatch[1]}`

  // Chrome — must check after Edge/Opera/Samsung
  const chromeMatch = ua.match(/Chrome\/(\d+)/)
  if (chromeMatch) return `Chrome ${chromeMatch[1]}`

  // Safari — must check last (many browsers include "Safari")
  const safariMatch = ua.match(/Version\/(\d+).*Safari/)
  if (safariMatch) return `Safari ${safariMatch[1]}`

  if (ua.includes('Safari')) return 'Safari'

  return 'Navigateur inconnu'
}

function detectOs(ua: string): string {
  // iOS (iPhone)
  if (ua.includes('iPhone')) {
    const iosMatch = ua.match(/OS (\d+)[_.](\d+)/)
    return iosMatch ? `iOS ${iosMatch[1]}.${iosMatch[2]}` : 'iOS'
  }

  // iOS (iPad)
  if (ua.includes('iPad')) {
    const iosMatch = ua.match(/OS (\d+)[_.](\d+)/)
    return iosMatch ? `iPadOS ${iosMatch[1]}.${iosMatch[2]}` : 'iPadOS'
  }

  // Android
  const androidMatch = ua.match(/Android (\d+(?:\.\d+)?)/)
  if (androidMatch) return `Android ${androidMatch[1]}`

  // Windows
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11'
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1'
  if (ua.includes('Windows NT 6.1')) return 'Windows 7'
  if (ua.includes('Windows')) return 'Windows'

  // macOS
  const macMatch = ua.match(/Mac OS X (\d+)[_.](\d+)/)
  if (macMatch) return `macOS ${macMatch[1]}.${macMatch[2]}`
  if (ua.includes('Macintosh')) return 'macOS'

  // Linux
  if (ua.includes('CrOS')) return 'Chrome OS'
  if (ua.includes('Linux')) return 'Linux'

  return 'OS inconnu'
}

function detectDeviceType(ua: string): DeviceType {
  if (!ua) return 'unknown'

  // Tablets — check before mobile (iPad contains "Mobile" sometimes)
  if (ua.includes('iPad') || ua.includes('Tablet') || (ua.includes('Android') && !ua.includes('Mobile'))) {
    return 'tablet'
  }

  // Mobile
  if (ua.includes('Mobile') || ua.includes('iPhone') || (ua.includes('Android') && ua.includes('Mobile'))) {
    return 'mobile'
  }

  // Desktop (everything else with a recognized OS)
  if (ua.includes('Windows') || ua.includes('Macintosh') || ua.includes('Linux') || ua.includes('CrOS')) {
    return 'desktop'
  }

  return 'unknown'
}

/**
 * Mask an IP address for privacy.
 * - IPv4: "192.168.1.42" → "192.168.*.*"
 * - IPv6: truncate after 4th block, e.g. "2001:0db8:85a3:0000:..." → "2001:0db8:85a3:****"
 * - Empty/null: returns empty string
 */
export function maskIpAddress(ip: string): string {
  if (!ip) return ''

  // IPv4
  if (ip.includes('.') && !ip.includes(':')) {
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`
    }
    return ip
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':')
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:****`
    }
    return ip
  }

  return ip
}
