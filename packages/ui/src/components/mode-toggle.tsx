'use client'

import { useState, useTransition } from 'react'
import { cn } from '@monprojetpro/utils'
import { setActiveViewMode } from './mode-toggle-action'

/**
 * ModeToggle — Bascule visuelle entre Mode Lab et Mode One.
 *
 * ADR-01 Révision 2 (2026-04-13) :
 * - Visible uniquement si le client a `lab_mode_available === true`
 *   (clients gradués post-graduation, ou clients Lab natifs)
 * - Le mode actif est stocké dans un cookie navigateur (`mpp_active_view`)
 *   pour zéro DB write et persistance entre sessions
 * - Le toggle appelle une Server Action qui pose le cookie côté serveur,
 *   puis un full reload (`window.location.replace('/')`) garantit que le
 *   layout et la page d'accueil se re-rendent avec le nouveau mode.
 *
 * IMPORTANT : ce composant ne change PAS `dashboard_type` en DB.
 * `dashboard_type` reste le statut canonique (Lab natif ou One gradué).
 * Le toggle est une préférence d'affichage uniquement.
 */

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
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'lab' | 'one'>(currentMode)

  // Si le client n'a pas accès au Mode Lab, on ne montre pas le toggle.
  if (!labModeAvailable) return null

  const handleToggle = (newMode: 'lab' | 'one') => {
    if (newMode === mode) return
    setMode(newMode)
    onToggle?.(newMode)
    startTransition(async () => {
      await setActiveViewMode(newMode)
      if (typeof window !== 'undefined') {
        window.location.replace('/')
      }
    })
  }

  return (
    <div
      role="group"
      aria-label="Bascule Mode Lab / Mode One"
      className="bg-[#0f0f0f] border border-[#3d3d3d] rounded-full flex h-8 w-[288px] p-[3px]"
    >
      <button
        type="button"
        onClick={() => handleToggle('lab')}
        disabled={isPending}
        aria-pressed={mode === 'lab'}
        className={cn(
          'flex-1 rounded-full text-[12px] font-semibold tracking-[0.04em] uppercase transition-all duration-200',
          mode === 'lab'
            ? 'bg-[#7c3aed] text-white'
            : 'text-[#6b7280] hover:text-white'
        )}
      >
        Mode Lab
      </button>
      <button
        type="button"
        onClick={() => handleToggle('one')}
        disabled={isPending}
        aria-pressed={mode === 'one'}
        className={cn(
          'flex-1 rounded-full text-[12px] font-semibold tracking-[0.04em] uppercase transition-all duration-200',
          mode === 'one'
            ? 'bg-[#16a34a] text-white'
            : 'text-[#6b7280] hover:text-white'
        )}
      >
        Mode One
      </button>
    </div>
  )
}
