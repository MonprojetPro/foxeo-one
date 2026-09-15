'use client'

import { useCallback, useRef, useState } from 'react'
import { FileText, ExternalLink, ImageOff, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, toast } from '@monprojetpro/ui'
import { refreshContactAttachmentUrl } from '../actions/contact-messages'
import {
  isImageAttachment,
  formatAttachmentSize,
  isAttachmentUrlExpired,
} from '../utils/attachments'
import type { ContactAttachment } from '../types'

/**
 * Pièces jointes d'un message du fil Aide & Contact (guichet MenuFacile v13).
 *
 * Le bucket MenuFacile est privé : chaque `url` est signée et expire au bout
 * d'une heure. En pratique le fil est rechargé toutes les 15 s tant qu'il est
 * ouvert, donc les liens sont frais ; le renouvellement sert de filet pour un
 * onglet laissé en veille, sans quoi MiKL verrait une image cassée et croirait
 * la capture perdue.
 */

export function ContactAttachments({
  threadId,
  attachments,
}: {
  threadId: string
  attachments: ContactAttachment[]
}) {
  // URL renouvelées, par identifiant de pièce jointe. L'identifiant est stable,
  // l'URL non : on ne remplace donc que l'URL, jamais l'objet du fil.
  const [freshUrls, setFreshUrls] = useState<Record<string, string>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [broken, setBroken] = useState<Record<string, true>>({})
  const [viewer, setViewer] = useState<ContactAttachment | null>(null)
  // Un échec de chargement ne doit être réessayé qu'une fois : un fichier
  // réellement supprimé ferait sinon boucler onError → refresh → onError.
  const retried = useRef<Set<string>>(new Set())

  const urlOf = useCallback(
    (a: ContactAttachment) => freshUrls[a.id] ?? a.url,
    [freshUrls],
  )

  const refresh = useCallback(
    async (a: ContactAttachment): Promise<string | null> => {
      setPendingId(a.id)
      try {
        const res = await refreshContactAttachmentUrl({ threadId, attachmentId: a.id })
        if (res.error || !res.data) {
          setBroken((prev) => ({ ...prev, [a.id]: true }))
          toast.error(res.error?.message ?? 'Lien de la pièce jointe indisponible')
          return null
        }
        setFreshUrls((prev) => ({ ...prev, [a.id]: res.data!.url }))
        setBroken((prev) => {
          const next = { ...prev }
          delete next[a.id]
          return next
        })
        return res.data.url
      } finally {
        setPendingId(null)
      }
    },
    [threadId],
  )

  const onImageError = (a: ContactAttachment) => {
    if (retried.current.has(a.id)) {
      setBroken((prev) => ({ ...prev, [a.id]: true }))
      return
    }
    retried.current.add(a.id)
    void refresh(a)
  }

  /**
   * Ouverture d'un fichier non affichable (PDF…) dans un onglet. Si le lien est
   * périmé, on le renouvelle d'abord : ouvrir l'onglet après l'attente serait
   * bloqué par le navigateur (pop-up hors geste utilisateur), on demande donc
   * un second clic plutôt que d'ouvrir un onglet vide.
   */
  const openFile = async (e: React.MouseEvent<HTMLAnchorElement>, a: ContactAttachment) => {
    if (!isAttachmentUrlExpired(a) || freshUrls[a.id]) return
    e.preventDefault()
    const url = await refresh(a)
    if (url) toast.success('Lien renouvelé — clique à nouveau pour ouvrir')
  }

  if (!attachments.length) return null

  const images = attachments.filter(isImageAttachment)
  const files = attachments.filter((a) => !isImageAttachment(a))

  return (
    <>
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setViewer(a)}
              title={`${a.file_name}${formatAttachmentSize(a.size_bytes) ? ` · ${formatAttachmentSize(a.size_bytes)}` : ''}`}
              className="group relative h-20 w-20 overflow-hidden rounded-md border border-white/15 bg-black/20 transition-colors hover:border-cyan-400/50"
            >
              {broken[a.id] ? (
                <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.6rem] text-gray-500">
                  <ImageOff className="h-4 w-4" />
                  Indisponible
                </span>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={urlOf(a)}
                  alt={a.file_name}
                  className="h-full w-full object-cover"
                  onError={() => onImageError(a)}
                />
              )}
              {pendingId === a.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((a) => (
            <a
              key={a.id}
              href={urlOf(a)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => void openFile(e, a)}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-gray-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{a.file_name}</span>
              {formatAttachmentSize(a.size_bytes) && (
                <span className="shrink-0 text-gray-500">{formatAttachmentSize(a.size_bytes)}</span>
              )}
              {pendingId === a.id ? (
                <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60" />
              )}
            </a>
          ))}
        </div>
      )}

      {/* Visionneuse plein écran */}
      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate text-sm font-normal">
              {viewer?.file_name}
              {viewer && formatAttachmentSize(viewer.size_bytes) && (
                <span className="ml-2 text-xs text-gray-500">{formatAttachmentSize(viewer.size_bytes)}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewer && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlOf(viewer)}
                alt={viewer.file_name}
                className="max-h-[70vh] w-full rounded-md object-contain"
                onError={() => onImageError(viewer)}
              />
              <a
                href={urlOf(viewer)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-cyan-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ouvrir dans un onglet
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
