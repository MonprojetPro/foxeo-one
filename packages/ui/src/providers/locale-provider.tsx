/**
 * LocaleProvider — React Context for locale management
 *
 * Provides current locale and ability to change it
 * Persists locale in NEXT_LOCALE cookie
 */

'use client'

import { createContext, useState, useEffect, type ReactNode } from 'react'
import { DEFAULT_LOCALE, type Locale } from '@monprojetpro/utils'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    // Initialize from cookie on client
    if (typeof document !== 'undefined') {
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('NEXT_LOCALE='))
        ?.split('=')[1] as Locale | undefined

      if (cookieValue) {
        setLocaleState(cookieValue)
      }
    }
  }, [])

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale)
    // Set cookie for persistence
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${365 * 24 * 60 * 60}`
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}
