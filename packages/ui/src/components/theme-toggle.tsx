'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@monprojetpro/supabase/theme'
import { Button } from '../button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const effectiveTheme =
    theme === 'system'
      ? typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
      aria-label={
        effectiveTheme === 'dark'
          ? 'Activer le mode clair'
          : 'Activer le mode sombre'
      }
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Basculer le thème</span>
    </Button>
  )
}
