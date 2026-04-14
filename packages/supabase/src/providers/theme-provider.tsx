'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark' | 'system'
type DashboardTheme = 'hub' | 'lab' | 'one'

type ThemeContextType = {
  theme: Theme
  dashboardTheme: DashboardTheme
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'monprojetpro-theme'

const ThemeContext = createContext<ThemeContextType | null>(null)

function getStoredTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') return defaultTheme
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return defaultTheme
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  dashboardTheme = 'hub',
}: {
  children: ReactNode
  defaultTheme?: Theme
  dashboardTheme?: DashboardTheme
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  // Hydrate from localStorage on mount
  useEffect(() => {
    setThemeState(getStoredTheme(defaultTheme))
  }, [defaultTheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
  }

  useEffect(() => {
    const root = document.documentElement

    root.classList.remove(
      'light',
      'dark',
      'theme-hub',
      'theme-lab',
      'theme-one'
    )

    root.classList.add(`theme-${dashboardTheme}`)

    const effectiveTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme

    root.classList.add(effectiveTheme)
  }, [theme, dashboardTheme])

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, dashboardTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
