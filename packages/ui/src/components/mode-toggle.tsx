'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@monprojetpro/utils'

/**
 * ModeToggle — Bascule visuelle entre Mode Lab et Mode One.
 *
 * ADR-01 Révision 2 (2026-04-13) :
 * - Visible uniquement si le client a `lab_mode_available === true`
 *   (clients gradués post-graduation, ou clients Lab natifs)
 * - Le mode actif est stocké dans un cookie navigateur (`mpp_active_view`)
 *   pour zéro DB write et persistance entre sessions
 * - Le toggle déclenche `router.refresh()` pour que le layout serveur
 *   recalcule les onglets / thème selon le nouveau mode actif
 *
 * IMPORTANT : ce composant ne change PAS `dashboard_type` en DB.
 * `dashboard_type` reste le statut canonique (Lab natif ou One gradué).
 * Le toggle est une préférence d'affichage uniquement.
 */

export const MODE_TOGGLE_COOKIE = 'mpp_active_view'

export interface ModeToggleProps {
  currentMode: 'lab' | 'one'
  labModeAvailable: boolean
  onToggle?: (newMode: 'lab' | 'one') => void
}

export function ModeToggle({
  currentMode,
  labModeAvailable,
  onToggle,
}: ModeToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'lab' | 'one'>(currentMode)

  // Si le client n'a pas accès au Mode Lab, on ne montre pas le toggle.
  if (!labModeAvailable) return null

  const handleToggle = (newMode: 'lab' | 'one') => {
    if (newMode === mode) return
    setMode(newMode)
    // Cookie un an, scoped à toute l'app
    document.cookie = `${MODE_TOGGLE_COOKIE}=${newMode}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    onToggle?.(newMode)
    startTransition(() => router.refresh())
  }

  return (
    <div
      role="group"
      aria-label="Bascule Mode Lab / Mode One"
      className="bg-[#0f0f0f] rounded-full border border-[#3d3d3d] flex h-8 w-[280px]"
    >
      <button
        type="button"
        onClick={() => handleToggle('lab')}
        disabled={isPending}
        aria-pressed={mode === 'lab'}
        className={cn(
          'flex-1 rounded-full text-sm transition-all font-medium',
          mode === 'lab'
            ? 'bg-[#7c3aed] text-white'
            : 'text-[#6b7280] hover:text-white'
        )}
      >
        Lab
      </button>
      <button
        type="button"
        onClick={() => handleToggle('one')}
        disabled={isPending}
        aria-pressed={mode === 'one'}
        className={cn(
          'flex-1 rounded-full text-sm transition-all font-medium',
          mode === 'one'
            ? 'bg-[#7c3aed] text-white'
            : 'text-[#6b7280] hover:text-white'
        )}
      >
        One
      </button>
    </div>
  )
}
