'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { MODE_TOGGLE_COOKIE, MODE_LOCKED_MESSAGES } from './mode-toggle-constants'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../dialog'
import { Button } from '../button'

/**
 * ModeToggle — Bascule visuelle entre Mode Lab et Mode One.
 *
 * ADR-01 Révision 2 + matrice d'accès conditionnelle :
 * - Visible dès que le client a accès au Lab (`labModeAvailable === true`) :
 *   Lab natif (non gradué) ET gradué. Un One direct pur n'a pas de toggle.
 * - Les DEUX boutons sont toujours affichés. Cliquer sur un mode VERROUILLÉ
 *   (ex : Mode One pour un Lab non gradué → `oneLocked`) n'y entre PAS : un message
 *   de teasing s'affiche (textes vision produit). Cliquer sur un mode disponible
 *   pose le cookie `mpp_active_view` + recharge la home du mode cible.
 *
 * IMPORTANT : ce composant ne change PAS `dashboard_type` en DB.
 * Le verrouillage réel est garanti côté serveur (resolveClientMode) ; ce composant
 * ne fait qu'éviter une navigation inutile et expliquer pourquoi au client.
 */

export interface ModeToggleProps {
  currentMode: 'lab' | 'one'
  labModeAvailable: boolean
  /** Mode One verrouillé (client Lab non gradué) → clic = message au lieu d'entrer. */
  oneLocked?: boolean
  /** Mode Lab verrouillé (cas théorique) → clic = message au lieu d'entrer. */
  labLocked?: boolean
  onToggle?: (newMode: 'lab' | 'one') => void
  labPath?: string
  onePath?: string
}

export function ModeToggle({
  currentMode,
  labModeAvailable,
  oneLocked = false,
  labLocked = false,
  onToggle,
  labPath = '/modules/parcours',
  onePath = '/',
}: ModeToggleProps) {
  const [mode, setMode] = useState<'lab' | 'one'>(currentMode)
  const [lockedDialog, setLockedDialog] = useState<'lab' | 'one' | null>(null)

  // Si le client n'a pas accès au Mode Lab, on ne montre pas le toggle.
  if (!labModeAvailable) return null

  const navigate = (newMode: 'lab' | 'one') => {
    setMode(newMode)
    onToggle?.(newMode)
    // Cookie posé côté client (httpOnly=false). Navigation directe vers la
    // home du mode cible pour éviter le redirect server-side de '/' →
    // '/modules/parcours' qui causait un hooks count mismatch (React #310).
    document.cookie = `${MODE_TOGGLE_COOKIE}=${newMode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    window.location.replace(newMode === 'lab' ? labPath : onePath)
  }

  const handleClick = (newMode: 'lab' | 'one') => {
    if (newMode === mode) return
    // Mode verrouillé → message de teasing, pas de navigation.
    if (newMode === 'one' && oneLocked) {
      setLockedDialog('one')
      return
    }
    if (newMode === 'lab' && labLocked) {
      setLockedDialog('lab')
      return
    }
    navigate(newMode)
  }

  const dialogContent = lockedDialog ? MODE_LOCKED_MESSAGES[lockedDialog] : null

  return (
    <>
      <div
        role="group"
        aria-label="Bascule Mode Lab / Mode One"
        className="bg-[#0f0f0f] border border-[#3d3d3d] rounded-full flex h-8 w-[288px] p-[3px]"
      >
        <button
          type="button"
          onClick={() => handleClick('lab')}
          aria-pressed={mode === 'lab'}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1 rounded-full text-[12px] font-semibold tracking-[0.04em] uppercase transition-all duration-200',
            mode === 'lab'
              ? 'bg-[#7c3aed] text-white'
              : 'text-[#6b7280] hover:text-white',
            labLocked && mode !== 'lab' && 'opacity-70'
          )}
        >
          {labLocked && <Lock className="h-3 w-3" aria-hidden="true" />}
          Mode Lab
        </button>
        <button
          type="button"
          onClick={() => handleClick('one')}
          aria-pressed={mode === 'one'}
          style={mode === 'one' ? { backgroundColor: 'var(--brand-accent, #16a34a)', color: 'var(--brand-accent-fg, #ffffff)' } : undefined}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1 rounded-full text-[12px] font-semibold tracking-[0.04em] uppercase transition-all duration-200',
            mode === 'one'
              ? ''
              : 'text-[#6b7280] hover:text-white',
            oneLocked && mode !== 'one' && 'opacity-70'
          )}
        >
          {oneLocked && <Lock className="h-3 w-3" aria-hidden="true" />}
          Mode One
        </button>
      </div>

      <Dialog open={lockedDialog !== null} onOpenChange={(open) => !open && setLockedDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogContent?.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-1">
              {dialogContent?.body}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setLockedDialog(null)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
