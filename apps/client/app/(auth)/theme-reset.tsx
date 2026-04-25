'use client'

import { useEffect } from 'react'

// Remet le thème Lab (violet) sur <html> lors du chargement de la page de login.
// Nécessaire car ThemeClassSetter dans le dashboard layout applique theme-one
// sur <html>, et la classe persiste lors d'une navigation client-side vers /login.
export function ThemeReset() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-hub', 'theme-one')
    root.classList.add('theme-lab')
    root.dataset.theme = 'lab'
  }, [])
  return null
}
