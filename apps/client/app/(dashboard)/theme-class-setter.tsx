'use client'

import { useEffect } from 'react'

/**
 * ADR-01 Révision 2 — Synchronise la classe CSS de thème (`theme-lab` / `theme-one`)
 * sur `<html>` en fonction du mode actif calculé côté serveur (cookie `mpp_active_view`).
 *
 * Le `ThemeProvider` racine applique une classe `theme-*` par défaut au mount. Ce
 * composant s'exécute APRÈS lui dans le sous-arbre (dashboard), et corrige la classe
 * pour refléter le mode effectif du client (qui ne peut être calculé qu'après lecture
 * de `client_configs` côté serveur). Résultat : le thème violet Lab / orange One
 * bascule instantanément quand l'utilisateur clique sur le ModeToggle.
 */
export function ThemeClassSetter({ activeMode }: { activeMode: 'lab' | 'one' }) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-hub', 'theme-lab', 'theme-one')
    root.classList.add(`theme-${activeMode}`)
    root.dataset.theme = activeMode
  }, [activeMode])

  return null
}
