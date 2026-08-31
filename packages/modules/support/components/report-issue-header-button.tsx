'use client'

// ============================================================
// Icône « signaler un problème » dans la barre d'en-tête (Lab)
// ============================================================
// Demande MiKL 2026-08-31 : le seul point d'entrée existant (bouton en bas
// de la FAQ) est trop discret. Ce bouton vit à côté de la cloche de
// notification, visible sur tout le dashboard Lab — pas seulement sur
// l'écran support.
//
// Triangle d'alerte plutôt qu'un icône neutre, légèrement rouge au repos
// (jamais rouge plein — cette teinte reste réservée aux vraies alertes/
// erreurs) pour attirer l'œil sans crier.

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ReportIssueDialog } from './report-issue-dialog'

export function ReportIssueHeaderButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-red-400/70 transition-colors hover:bg-white/10 hover:text-red-400"
        title="Signaler un problème"
        aria-label="Signaler un problème"
      >
        <AlertTriangle className="h-[18px] w-[18px]" />
      </button>
      <ReportIssueDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
