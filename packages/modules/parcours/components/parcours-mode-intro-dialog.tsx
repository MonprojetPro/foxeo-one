'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@monprojetpro/ui'
import type { ParcoursMode } from '../types/parcours.types'

interface ParcoursModeIntroDialogProps {
  clientId: string
  mode: ParcoursMode
  /** Prénom pour personnaliser le bonjour du Concierge. */
  clientFirstName?: string | null
}

/** Clé de mémorisation « déjà vu » — dépend du mode : un changement de mode ré-affiche l'intro. */
function seenKey(clientId: string, mode: ParcoursMode): string {
  return `mpp:parcours-intro:${clientId}:${mode}`
}

/**
 * Pop-up d'accueil portée par Élio le Concierge — explique au client les RÈGLES de son
 * parcours (tracé vs libre) quand il le découvre. S'affiche :
 *   • à la première découverte du parcours (par client) ;
 *   • à nouveau si MiKL change le mode (la clé « déjà vu » inclut le mode).
 *
 * Important (mode libre) : on informe honnêtement le client que les agents se concentrent
 * chacun sur leur étape et qu'Élio relie les étapes une fois qu'elles sont VALIDÉES — pour
 * qu'il sache pourquoi finaliser/soumettre est utile et qu'il ne s'étonne pas d'une question
 * déjà abordée ailleurs.
 *
 * Persistance volontairement en localStorage (intro non critique, pas de table dédiée) :
 * sur un nouvel appareil, l'intro se re-montre — comportement acceptable et plutôt utile.
 */
export function ParcoursModeIntroDialog({ clientId, mode, clientFirstName }: ParcoursModeIntroDialogProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!clientId) return
    try {
      const seen = window.localStorage.getItem(seenKey(clientId, mode))
      if (!seen) setOpen(true)
    } catch {
      // localStorage indispo (mode privé strict) → on ouvre quand même une fois par session.
      setOpen(true)
    }
  }, [clientId, mode])

  const dismiss = () => {
    try {
      window.localStorage.setItem(seenKey(clientId, mode), '1')
    } catch {
      /* best-effort */
    }
    setOpen(false)
  }

  const greeting = `Bonjour${clientFirstName ? `, ${clientFirstName}` : ''} ! 👋`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss() }}>
      <DialogContent className="max-w-md border-[#3d2d6d] bg-[#141414]">
        <DialogTitle className="sr-only">Bienvenue dans ton parcours Lab</DialogTitle>

        <div className="flex flex-col items-center text-center">
          <img
            src="/elio/elio-concierge.png"
            alt="Élio, le Concierge"
            className="h-24 w-24 object-contain drop-shadow-[0_0_14px_rgba(167,139,250,0.3)]"
          />
          <p className="mt-2 text-[15px] font-semibold text-[#a78bfa]">Élio, le Concierge</p>
          <p className="text-[12px] text-[#9ca3af]">Ton assistant Lab</p>

          <div className="mt-4 w-full rounded-xl border border-[#3d2d6d] bg-[#1e1557] p-4 text-left text-sm leading-relaxed text-[#e5e7eb]">
            <p className="text-[15px] font-semibold text-[#f9fafb]">{greeting}</p>

            {mode === 'libre' ? (
              <>
                <p className="mt-2">
                  Ton parcours est en <strong className="text-[#c4b5fd]">mode libre</strong> : toutes les
                  étapes sont ouvertes. Tu avances dans l’ordre que tu veux, et même sur plusieurs
                  étapes en parallèle si ça t’arrange.
                </p>
                <p className="mt-3 rounded-lg border border-[#a78bfa]/30 bg-[#a78bfa]/10 p-3 text-[13px] text-[#ddd6fe]">
                  💡 <strong>Bon à savoir :</strong> dans chaque étape, l’agent se concentre sur sa
                  mission. Pour que je relie tout ton projet et que les agents tiennent compte de ce
                  que tu as fait ailleurs, <strong>finalise et fais valider tes étapes par MiKL</strong> :
                  c’est à la validation que ton travail devient une base commune à tout le parcours.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2">
                  Ton parcours est organisé <strong className="text-[#c4b5fd]">étape par étape</strong>.
                  Tu avances dans l’ordre : chaque nouvelle étape se débloque une fois que MiKL a
                  validé la précédente.
                </p>
                <p className="mt-3 rounded-lg border border-[#a78bfa]/30 bg-[#a78bfa]/10 p-3 text-[13px] text-[#ddd6fe]">
                  💡 À chaque validation, je garde en mémoire ce qui a été établi pour assurer la
                  cohérence de tout ton projet. Tu peux aussi revenir en arrière si MiKL rouvre une étape.
                </p>
              </>
            )}

            <p className="mt-3 text-[13px] text-[#9ca3af]">
              Une question à tout moment ? Je reste dispo via « Pose-moi une question ».
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-4 w-full rounded-lg bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#8b4df0]"
          >
            J’ai compris, c’est parti !
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
