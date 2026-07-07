'use client'

import { useEffect } from 'react'

/**
 * Les pages /graduation/* vivent HORS du groupe (dashboard) : le
 * ThemeClassSetter du shell ne s'exécute pas ici, et le layout racine pose
 * `theme-lab` en dur sur <html> — d'où des popovers/boutons violets sur les
 * écrans One. Le thème est piloté par les classes `theme-*` (cf.
 * theme-class-setter.tsx), PAS par l'attribut data-theme.
 * Le client qui voit ces pages est forcément gradué → thème One.
 */
export function ThemeOneSetter() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('dark', 'theme-transition')
    root.classList.remove('theme-hub', 'theme-lab')
    root.classList.add('theme-one')
    root.dataset.theme = 'one'

    // Retirer la classe de transition une fois le fondu Lab → One terminé
    const cleanupTimer = setTimeout(() => {
      root.classList.remove('theme-transition')
    }, 1500)

    return () => {
      clearTimeout(cleanupTimer)
      root.classList.remove('theme-transition')
    }
  }, [])

  return null
}
