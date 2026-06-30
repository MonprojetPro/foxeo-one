'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@monprojetpro/ui'
import { useReports, useModerationActions } from '../hooks/use-moderation'
import type { MenuFacileReport, ReportStatus } from '../types'

const STATUS_FILTERS: { key: ReportStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'reviewed', label: 'Examinés' },
  { key: 'dismissed', label: 'Rejetés' },
  { key: 'acted', label: 'Traités' },
]

const STATUS_BADGE: Record<ReportStatus, string> = {
  pending: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  reviewed: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
  dismissed: 'bg-gray-400/15 text-gray-300 border-gray-400/30',
  acted: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

// ---------------------------------------------------------------------------
// Dialog de traitement d'un signalement
// ---------------------------------------------------------------------------

function ReportActionDialog({
  report,
  onClose,
  onBanAuthor,
}: {
  report: MenuFacileReport | null
  onClose: () => void
  onBanAuthor: (userId: string) => void
}) {
  const { hide, resolve } = useModerationActions()
  const [reason, setReason] = useState('')
  const [newStatus, setNewStatus] = useState<ReportStatus>('reviewed')

  const busy = hide.isPending || resolve.isPending

  if (!report) return null

  const recipe = report.recipe

  const doHide = (hidden: boolean) => {
    hide.mutate(
      { recipeId: report.recipe_id, hidden, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success(hidden ? 'Recette masquée' : 'Recette réaffichée')
          onClose()
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  const doResolve = () => {
    resolve.mutate(
      { reportId: report.id, status: newStatus, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success('Signalement résolu')
          onClose()
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Traiter le signalement</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Aperçu de la recette signalée (Option B) */}
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex gap-3">
              {recipe?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.photo_url}
                  alt={recipe.name ?? 'Recette signalée'}
                  className="h-20 w-20 rounded-md object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="h-20 w-20 rounded-md bg-white/5 border border-white/10 shrink-0 flex items-center justify-center text-[0.6rem] text-gray-500 text-center px-1">
                  pas d&apos;image
                </div>
              )}
              <div className="min-w-0 space-y-1">
                {recipe?.name ? (
                  <p className="text-white font-medium">{recipe.name}</p>
                ) : (
                  <p className="text-gray-400">
                    Recette <span className="font-mono text-xs">{report.recipe_id}</span>
                    <span className="block text-[0.7rem] text-amber-300/80">
                      (aperçu non fourni par MenuFacile)
                    </span>
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {recipe?.is_hidden && (
                    <Badge variant="outline" className="bg-red-400/15 text-red-300 border-red-400/30">Masquée</Badge>
                  )}
                  {recipe?.is_public !== undefined && (
                    <Badge variant="outline" className="bg-white/5 text-gray-300 border-white/10">
                      {recipe.is_public ? 'Publique' : 'Privée'}
                    </Badge>
                  )}
                </div>
                {recipe?.author_name || recipe?.author_id ? (
                  <p className="text-xs text-gray-400">
                    Auteur : {recipe.author_name ?? <span className="font-mono">{recipe.author_id}</span>}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 space-y-1 border-t border-white/10 pt-2 text-xs">
              <p><span className="text-gray-400">Signalé par :</span> <span className="font-mono">{report.reported_by}</span></p>
              <p><span className="text-gray-400">Motif :</span> {report.reason}</p>
              {report.details && <p><span className="text-gray-400">Détails :</span> {report.details}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mf-reason">Raison / note (optionnel)</Label>
            <Textarea
              id="mf-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Note interne sur la décision…"
              rows={2}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => doHide(true)}>
              Masquer la recette
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => doHide(false)}>
              Réafficher
            </Button>
            {recipe?.author_id && (
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => onBanAuthor(recipe.author_id as string)}
              >
                Bannir l&apos;auteur
              </Button>
            )}
          </div>

          <div className="flex items-end gap-2 pt-2 border-t border-white/10">
            <div className="flex-1 space-y-1.5">
              <Label>Statut du signalement</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ReportStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reviewed">Examiné</SelectItem>
                  <SelectItem value="dismissed">Rejeté</SelectItem>
                  <SelectItem value="acted">Traité</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" disabled={busy} onClick={doResolve}>
              Résoudre
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Dialog de bannissement utilisateur
// ---------------------------------------------------------------------------

function BanDialog({
  open,
  initialUserId,
  onClose,
}: {
  open: boolean
  initialUserId?: string
  onClose: () => void
}) {
  const { ban } = useModerationActions()
  const [userId, setUserId] = useState(initialUserId ?? '')
  const [until, setUntil] = useState('')
  const [reason, setReason] = useState('')

  const submit = (lift: boolean) => {
    if (!userId.trim()) {
      toast.error('Identifiant utilisateur requis')
      return
    }
    ban.mutate(
      {
        userId: userId.trim(),
        until: lift ? null : until ? new Date(until).toISOString() : null,
        reason: reason || undefined,
      },
      {
        onSuccess: () => {
          toast.success(lift ? 'Ban levé' : 'Utilisateur banni')
          setUserId('')
          setUntil('')
          setReason('')
          onClose()
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bannir / débannir un utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="mf-uid">Identifiant utilisateur</Label>
            <Input
              id="mf-uid"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user_id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mf-until">Banni jusqu&apos;au (vide = permanent)</Label>
            <Input
              id="mf-until"
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mf-ban-reason">Raison (optionnel)</Label>
            <Textarea
              id="mf-ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" disabled={ban.isPending} onClick={() => submit(true)}>
            Lever le ban
          </Button>
          <Button variant="destructive" size="sm" disabled={ban.isPending} onClick={() => submit(false)}>
            Bannir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Onglet Modération
// ---------------------------------------------------------------------------

export function ModerationTab() {
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending')
  const [active, setActive] = useState<MenuFacileReport | null>(null)
  const [banOpen, setBanOpen] = useState(false)
  const [banPrefill, setBanPrefill] = useState('')

  const openBan = (userId = '') => {
    setBanPrefill(userId)
    setBanOpen(true)
  }
  const banAuthor = (userId: string) => {
    setActive(null) // ferme le dialog du signalement
    openBan(userId)
  }

  const { data, isLoading, error, refetch, isFetching } = useReports(
    filter === 'all' ? undefined : filter,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                filter === f.key
                  ? 'bg-cyan-400/15 text-cyan-300'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openBan()}>
            Bannir un utilisateur
          </Button>
          <Button variant="ghost" size="sm" disabled={isFetching} onClick={() => refetch()}>
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-6 text-center">
          <p className="text-sm text-red-400">Impossible de charger les signalements</p>
          <p className="text-xs text-gray-500 mt-1">{(error as Error).message}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Recette</th>
                <th className="px-4 py-2 font-medium">Motif</th>
                <th className="px-4 py-2 font-medium">Détails</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <div className="h-5 rounded bg-white/5 animate-pulse" />
                  </td>
                </tr>
              ) : !data?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-500">
                    Aucun signalement{filter !== 'all' ? ' dans ce statut' : ''}.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 align-top">
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-2.5 text-gray-200 max-w-[12rem] truncate">
                      {r.recipe?.name ?? <span className="font-mono text-xs text-gray-500">{r.recipe_id}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-white">{r.reason}</td>
                    <td className="px-4 py-2.5 text-gray-400 max-w-xs truncate">{r.details ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={STATUS_BADGE[r.status]}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => setActive(r)}>
                        Traiter
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ReportActionDialog report={active} onClose={() => setActive(null)} onBanAuthor={banAuthor} />
      <BanDialog
        key={banPrefill || 'empty'}
        open={banOpen}
        initialUserId={banPrefill}
        onClose={() => setBanOpen(false)}
      />
    </div>
  )
}
