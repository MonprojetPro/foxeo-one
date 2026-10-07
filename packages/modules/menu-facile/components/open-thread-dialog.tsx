'use client'

import { useState } from 'react'
import { MessageSquarePlus, Send, Sparkles } from 'lucide-react'
import {
  AttachmentsPicker,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
  toast,
} from '@monprojetpro/ui'
import { useContactActions } from '../hooks/use-contact-messages'
import { adjustContactReply } from '../actions/adjust-reply'
import {
  attachToThreadOpening,
  createContactAttachmentUploadUrl,
  deleteContactMessage,
} from '../actions/contact-messages'
import { uploadOperatorAttachments } from '../utils/upload-operator-attachments'
import { compressImageIfPossible } from '@monprojetpro/utils'

/** Même borne que la saisie utilisateur et que la fonction en base. */
const MAX = 5000

/**
 * F-046 / F-046a — écrire à un utilisateur DANS l'application.
 *
 * À distinguer du bouton « Par e-mail » voisin : celui-ci crée un vrai fil de
 * contact. L'échange reste donc dans l'historique et l'utilisateur peut
 * répondre depuis l'application — ce qu'un e-mail ne permet pas.
 *
 * ── L'ordre d'envoi, et pourquoi il n'est pas celui des réponses ────────────
 *
 * Pour une réponse, les fichiers partent AVANT le message : le fil existe, donc
 * son dossier de dépôt aussi. Ici le fil n'existe pas encore — c'est ce qu'on
 * est en train de créer. L'ordre s'inverse : on ouvre, on téléverse, on
 * rattache.
 *
 * Conséquence assumée : un échec de téléversement laisse derrière lui un fil
 * déjà créé. On le SUPPRIME alors, pour tenir la même promesse que les
 * réponses — un message annonçant une capture qui n'est jamais arrivée est pire
 * que pas de message.
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
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const { open: openThread } = useContactActions()

  const busy = openThread.isPending || uploading || aiLoading
  const tropLong = draft.length > MAX

  /** Même ajustement que pour une réponse, sans message d'origine à citer. */
  const adjust = async () => {
    if (!draft.trim()) {
      toast.error('Écris d\'abord un brouillon à ajuster')
      return
    }
    setAiLoading(true)
    try {
      const res = await adjustContactReply({ draft })
      if (res.error || !res.data) toast.error(res.error?.message ?? 'Ajustement IA impossible')
      else {
        setDraft(res.data)
        toast.success('Message ajusté par l\'IA')
      }
    } finally {
      setAiLoading(false)
    }
  }

  function reinitialiser() {
    setDraft('')
    setFiles([])
  }

  async function envoyer() {
    const body = draft.trim()
    if (!body) {
      toast.error('Écris un message avant d\'envoyer')
      return
    }
    if (tropLong) {
      toast.error(`Message trop long (${draft.length} / ${MAX})`)
      return
    }

    // 1) Le fil — il faut son identifiant pour que le dossier de dépôt existe.
    let resultat: { id: string; emailed: boolean }
    try {
      resultat = await openThread.mutateAsync({ userId, body })
    } catch (e) {
      toast.error((e as Error).message)
      return
    }

    // 2) Les fichiers, s'il y en a.
    if (files.length > 0) {
      setUploading(true)
      try {
        const outcome = await uploadOperatorAttachments(resultat.id, files, {
          compress: compressImageIfPossible,
          createUploadUrl: (input) =>
            createContactAttachmentUploadUrl({
              threadId: input.threadId,
              fileName: input.fileName,
              mimeType: input.mimeType,
              sizeBytes: input.sizeBytes,
            }),
          put: async (url, file) => {
            const res = await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': file.type },
              body: file,
            })
            return { ok: res.ok, status: res.status }
          },
        })

        // 3) Rattachement — ou demi-tour complet.
        const attache = outcome.ok
          ? await attachToThreadOpening({
              threadId: resultat.id,
              attachmentIds: outcome.attachmentIds,
            })
          : null

        if (!outcome.ok || attache?.error) {
          // Le fil existe déjà : on le retire plutôt que de laisser partir un
          // message qui annonce des fichiers absents.
          await deleteContactMessage(resultat.id)
          toast.error(
            `${outcome.ok ? attache?.error?.message : outcome.message} — le message n'a pas été envoyé.`,
          )
          return
        }
      } finally {
        setUploading(false)
      }
    }

    // `emailed` est rapporté tel quel, succès comme échec. Un fil ouvert sans
    // e-mail est valide — la pastille s'allume dans l'application — mais le
    // destinataire n'a aucune raison de s'y connecter. Le taire laisserait
    // croire qu'on a prévenu quelqu'un qui n'a rien reçu.
    const avecFichiers = files.length > 0 ? ` et ${files.length} pièce${files.length > 1 ? 's' : ''} jointe${files.length > 1 ? 's' : ''}` : ''
    if (resultat.emailed) {
      toast.success(`Message envoyé à ${recipientLabel}${avecFichiers} — e-mail d'avertissement parti`)
    } else {
      toast.warning(
        `Message déposé dans l'application pour ${recipientLabel}${avecFichiers}, mais AUCUN e-mail n'est parti. ` +
          'Il ne le verra qu\'en se connectant.',
      )
    }
    reinitialiser()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v) }}>
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

          <AttachmentsPicker
            files={files}
            onChange={setFiles}
            onRejected={(m) => toast.error(m)}
            disabled={busy}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`text-xs tabular-nums ${tropLong ? 'text-red-300' : 'text-gray-500'}`}>
              {draft.length} / {MAX}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={adjust} disabled={busy}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {aiLoading ? 'Ajustement…' : 'Ajuster avec l\'IA'}
              </Button>
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
                {uploading ? 'Envoi des fichiers…' : openThread.isPending ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
