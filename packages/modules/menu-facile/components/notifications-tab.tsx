'use client'

import { useState } from 'react'
import {
  Bell,
  Send,
  Loader2,
  Trash2,
  AlertTriangle,
  Link2,
  Users,
  Info,
} from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Textarea,
  toast,
  useConfirmDialog,
} from '@monprojetpro/ui'
import {
  useNotifications,
  useNotificationAudienceCount,
  useNotificationActions,
} from '../hooks/use-notifications'
import { fullDate, relativeDate, num } from '../utils/format'

// Limites du contrat guichet (validation douce côté Hub, doublée côté action).
const LIMITS = { title: 120, body: 2000, link_url: 1000 } as const

/**
 * Onglet « Notifications » du cockpit MenuFacile (T-033).
 *
 * Second canal de diffusion après l'encart d'accueil : l'encart est PASSIF
 * (on le voit en ouvrant l'appli), une notification est ACTIVE (elle apparaît
 * dans la cloche et incrémente le badge, en temps réel).
 *
 * ⚠️ Canal unique `in_app`, établi par l'état des lieux du 2026-09-21 : l'appli
 * MenuFacile est une PWA qui ne collecte aucun jeton d'appareil. Aucun choix de
 * canal n'est donc proposé ici — offrir un bouton « push » serait promettre
 * quelque chose que rien ne peut tenir.
 */
export function NotificationsTab() {
  const { data: history, isLoading, error } = useNotifications()
  const { data: audience, isLoading: audienceLoading } = useNotificationAudienceCount()
  const { send, remove } = useNotificationActions()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const busy = send.isPending || remove.isPending
  const canSend = title.trim().length > 0 && body.trim().length > 0 && !busy

  const onSend = async () => {
    if (!canSend) return

    // Le compteur est affiché DANS la confirmation, jamais seulement à côté du
    // bouton : c'est au moment de valider que le nombre doit être sous les yeux.
    const destinataires =
      audience === undefined
        ? 'un nombre inconnu d\'utilisateurs (le compteur n\'a pas pu être chargé)'
        : `${num(audience)} utilisateur${audience > 1 ? 's' : ''}`

    const ok = await confirm({
      title: `Envoyer « ${title.trim()} » ?`,
      description:
        `Cette notification partira immédiatement à ${destinataires} de MenuFacile. ` +
        'Elle apparaîtra dans leur cloche. Un envoi ne se rattrape pas — il faudra ' +
        'la supprimer depuis l\'historique.',
      confirmLabel: 'Envoyer maintenant',
      cancelLabel: 'Annuler',
    })
    if (!ok) return

    try {
      const sent = await send.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        link_url: linkUrl.trim() || undefined,
        audience: 'all',
        channel: 'in_app',
      })
      // On annonce le nombre RENDU PAR LE GUICHET, pas celui qu'on avait prévu :
      // le seul chiffre sincère est celui des lignes réellement insérées.
      toast.success(
        `Notification envoyée à ${num(sent.recipients)} utilisateur${sent.recipients > 1 ? 's' : ''}`,
      )
      setTitle('')
      setBody('')
      setLinkUrl('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'envoi a échoué")
    }
  }

  const onDelete = async (id: string, label: string) => {
    const ok = await confirm({
      title: `Supprimer « ${label} » ?`,
      description:
        'La notification disparaîtra de chez TOUS les utilisateurs, y compris ceux ' +
        'qui l\'ont déjà lue. Cette suppression est définitive.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await remove.mutateAsync(id)
      toast.success('Notification supprimée')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'La suppression a échoué')
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog />

      {/* ── Composition ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-cyan-300" />
          <h2 className="text-sm font-medium text-gray-200">Nouvelle notification</h2>
        </div>

        <div className="space-y-4">
          {/* Titre */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-title">Titre</Label>
              <span className="text-[0.7rem] tabular-nums text-gray-500">
                {title.length}/{LIMITS.title}
              </span>
            </div>
            <Input
              id="notif-title"
              maxLength={LIMITS.title}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Nouvelle fonctionnalité disponible"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-body">Message</Label>
              <span className="text-[0.7rem] tabular-nums text-gray-500">
                {body.length}/{LIMITS.body}
              </span>
            </div>
            <Textarea
              id="notif-body"
              rows={4}
              maxLength={LIMITS.body}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ce que les utilisateurs liront dans leur cloche…"
            />
          </div>

          {/* Lien */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-link" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-gray-500" />
              Lien (optionnel)
            </Label>
            <Input
              id="notif-link"
              maxLength={LIMITS.link_url}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://… — vers quoi la notification renvoie dans l'appli"
            />
          </div>
        </div>

        {/* Ce que l'envoi fait RÉELLEMENT — écrit avant le bouton, pas après */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            L&apos;envoi est <strong>immédiat</strong> et part à{' '}
            <strong>tous les utilisateurs</strong>. Les personnes qui s&apos;inscriront
            après ne la recevront pas.
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <Users className="h-3.5 w-3.5 text-gray-500" />
            {audienceLoading ? (
              'Chargement du nombre de destinataires…'
            ) : audience === undefined ? (
              <span className="text-amber-300/90">
                Nombre de destinataires indisponible
              </span>
            ) : (
              <>
                <strong className="tabular-nums text-gray-200">{num(audience)}</strong>
                {' '}destinataire{audience > 1 ? 's' : ''}
              </>
            )}
          </span>

          <Button onClick={onSend} disabled={!canSend}>
            {send.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}
            {send.isPending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
      </div>

      {/* ── Historique ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="mb-4 text-sm font-medium text-gray-200">Envois précédents</h2>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de l&apos;historique…
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200/90"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Historique indisponible : {error instanceof Error ? error.message : 'erreur inconnue'}
            </span>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Aucune notification envoyée pour l&apos;instant.</span>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-gray-100">{n.title}</p>
                    <p className="whitespace-pre-wrap text-sm text-gray-400">{n.body}</p>
                    {n.link_url && (
                      <p className="flex items-center gap-1.5 text-xs text-cyan-300/80">
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{n.link_url}</span>
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(n.id, n.title)}
                    disabled={busy}
                    aria-label={`Supprimer la notification « ${n.title} »`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-gray-500">
                  <span title={fullDate(n.sent_at)}>{relativeDate(n.sent_at)}</span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {num(n.recipients)} destinataire{n.recipients > 1 ? 's' : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
