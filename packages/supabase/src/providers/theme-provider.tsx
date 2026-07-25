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

    // ⚠️ Correctif 2026-07-25 — Ne JAMAIS toucher aux classes `theme-hub/lab/one` ici.
    //
    // Les effets des composants ENFANTS s'exécutent AVANT ceux de leurs parents. Ce
    // provider étant monté à la racine, il écrasait systématiquement la classe posée
    // par `ThemeClassSetter` (sous-arbre dashboard) : le mode One s'affichait donc avec
    // les tokens VIOLETS du Lab après chaque chargement de page (`--primary` en hue 290).
    // Les composants One avaient contourné le symptôme en forçant leurs couleurs en
    // littéral — d'où un vert qui « bavait » à certains endroits et pas à d'autres.
    //
    // La classe de dashboard est désormais posée UNE SEULE FOIS côté serveur (className
    // de <html> dans chaque layout racine) puis ajustée par ThemeClassSetter selon le
    // mode réel du client. Ce provider ne gère plus que light/dark.
    root.classList.remove('light', 'dark')

    const effectiveTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme

    root.classList.add(effectiveTheme)
    // dashboardTheme reste dans les deps : il est encore exposé via le contexte
    // (consommé par useTheme) même s'il ne pilote plus la classe CSS.
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
