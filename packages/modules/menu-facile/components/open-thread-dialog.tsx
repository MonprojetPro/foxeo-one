'use client'

import { useState } from 'react'
import { MessageSquarePlus, Send } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
  toast,
} from '@monprojetpro/ui'
import { useContactActions } from '../hooks/use-contact-messages'

/** Même borne que la saisie utilisateur et que la fonction en base. */
const MAX = 5000

/**
 * F-046 — écrire à un utilisateur DANS l'application.
 *
 * À distinguer du bouton « Écrire » voisin, qui ouvre la messagerie personnelle :
 * celui-ci crée un vrai fil de contact. L'échange reste donc dans l'historique
 * et l'utilisateur peut répondre depuis l'application — ce qu'un e-mail ne
 * permet pas.
 *
 * Les deux boutons coexistent volontairement : un e-mail reste le bon outil
 * pour joindre quelqu'un qui ne se connecte plus.
 */
export function OpenThreadDialog({
  open,
  onOpenChange,
  userId,
  recipientLabel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** uuid du COMPTE destinataire, pas du foyer. */
  userId: string
  /** Ce qu'on montre à l'opérateur : prénom si connu, sinon e-mail. */
  recipientLabel: string
}) {
  const [draft, setDraft] = useState('')
  const { open: openThread } = useContactActions()
  const busy = openThread.isPending
  const tropLong = draft.length > MAX

  function envoyer() {
    const body = draft.trim()
    if (!body) {
      toast.error('Écris un message avant d\'envoyer')
      return
    }
    if (tropLong) {
      toast.error(`Message trop long (${draft.length} / ${MAX})`)
      return
    }

    openThread.mutate(
      { userId, body },
      {
        onSuccess: (res) => {
          // `emailed` est rapporté tel quel, succès comme échec. Un fil ouvert
          // sans e-mail est valide — la pastille s'allume dans l'application —
          // mais le destinataire n'a aucune raison de s'y connecter. Le taire
          // laisserait croire qu'on a prévenu quelqu'un qui n'a rien reçu.
          if (res.emailed) {
            toast.success(`Message envoyé à ${recipientLabel} — e-mail d'avertissement parti`)
          } else {
            toast.warning(
              `Message déposé dans l'application pour ${recipientLabel}, mais AUCUN e-mail n'est parti. ` +
                'Il ne le verra qu\'en se connectant.',
            )
          }
          setDraft('')
          onOpenChange(false)
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-cyan-300" />
            Écrire à {recipientLabel} dans l&apos;application
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-1">
          <p className="text-xs text-gray-400">
            Un nouveau fil de contact sera créé. Le destinataire le verra dans Réglages &rsaquo;
            Contact, recevra une pastille de notification et un e-mail, et pourra répondre
            directement dans l&apos;application.
          </p>

          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            autoFocus
            disabled={busy}
            placeholder="Écris ton message…"
          />

          <div className="flex items-center justify-between gap-3">
            <span className={`text-xs tabular-nums ${tropLong ? 'text-red-300' : 'text-gray-500'}`}>
              {draft.length} / {MAX}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Annuler
              </Button>
              <Button size="sm" onClick={envoyer} disabled={busy || tropLong || !draft.trim()}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {busy ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
