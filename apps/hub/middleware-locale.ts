/**
 * Locale detection middleware for Hub app
 *
 * Detects user's locale from:
 * 1. NEXT_LOCALE cookie (priority)
 * 2. Accept-Language header
 * 3. DEFAULT_LOCALE fallback
 *
 * Sets NEXT_LOCALE cookie for persistence
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@monprojetpro/utils'

export function detectLocale(request: NextRequest): Locale {
  // 1. Read NEXT_LOCALE cookie (priority)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value as Locale | undefined
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale
  }

  // 2. Read Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language')
  if (acceptLanguage) {
    // Parse header (e.g., "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7")
    const languages = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0])
      .filter((lang): lang is string => !!lang)
      .map((lang) => lang.trim().toLowerCase())

    for (const lang of languages) {
      // Extract language code (fr-FR → fr)
      const langCode = lang.split('-')[0] as Locale
      if (SUPPORTED_LOCALES.includes(langCode)) {
        return langCode
      }
    }
  }

  // 3. Fallback: DEFAULT_LOCALE
  return DEFAULT_LOCALE
}

export function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set('NEXT_LOCALE', locale, {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: false, // Needed for client-side access
  })
}
