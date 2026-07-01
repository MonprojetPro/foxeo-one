'use client'

import { useState } from 'react'
import { ShieldCheck, UserX, RefreshCw } from 'lucide-react'
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
import { useReports, useModerationActions, useRecipeFull } from '../hooks/use-moderation'
import type { MenuFacileReport, ReportStatus, OfficialRecipeDetail } from '../types'

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

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'En attente',
  reviewed: 'Examiné',
  dismissed: 'Rejeté',
  acted: 'Traité',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

// ---------------------------------------------------------------------------
// Vue « recette complète » (pour juger un signalement)
// ---------------------------------------------------------------------------

function RecipeFullView({ recipeId }: { recipeId: string }) {
  const { data, isLoading, error } = useRecipeFull(recipeId, true)

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        <div className="h-4 w-1/3 rounded bg-white/5 animate-pulse" />
        <div className="h-4 rounded bg-white/5 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-white/5 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200/90">
        Impossible d&apos;afficher la recette complète : {(error as Error).message}.
        <br />
        L&apos;endpoint <code>GET /recipes/:id</code> n&apos;est peut-être pas encore disponible
        côté MenuFacile.
      </div>
    )
  }
  if (!data) return null

  const d: OfficialRecipeDetail = data
  const diet = [
    d.is_vegetarian && 'Végétarien',
    d.is_gluten_free && 'Sans gluten',
    d.is_lactose_free && 'Sans lactose',
  ].filter(Boolean) as string[]

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-3 text-xs">
      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400">
        {d.prep_minutes != null && <span>Prépa : {d.prep_minutes} min</span>}
        {d.cook_minutes != null && <span>Cuisson : {d.cook_minutes} min</span>}
        {d.rest_minutes != null && <span>Repos : {d.rest_minutes} min</span>}
        {d.portions != null && <span>Portions : {d.portions}</span>}
        {d.difficulty && <span>Difficulté : {d.difficulty}</span>}
        {d.budget && <span>Budget : {d.budget}</span>}
      </div>
      {diet.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {diet.map((x) => (
            <Badge key={x} variant="outline" className="bg-white/5 text-gray-300 border-white/10">
              {x}
            </Badge>
          ))}
        </div>
      )}

      {/* Ingrédients */}
      {d.ingredients && d.ingredients.length > 0 && (
        <div>
          <p className="text-gray-300 font-medium mb-1">Ingrédients</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-400">
            {d.ingredients.map((ing, i) => (
              <li key={i}>
                {[ing.quantity, ing.unit].filter((v) => v != null && v !== '').join(' ')} {ing.name}
                {ing.aisle ? <span className="text-gray-600"> · {ing.aisle}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Étapes */}
      {d.steps && d.steps.length > 0 && (
        <div>
          <p className="text-gray-300 font-medium mb-1">Étapes</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            {d.steps.map((st, i) => (
              <li key={i}>{st.text}</li>
            ))}
          </ol>
        </div>
      )}

      {(d.notes || d.variants_tips) && (
        <div className="space-y-1 border-t border-white/10 pt-2 text-gray-400">
          {d.notes && <p><span className="text-gray-300">Notes :</span> {d.notes}</p>}
          {d.variants_tips && <p><span className="text-gray-300">Astuces :</span> {d.variants_tips}</p>}
        </div>
      )}

      {d.source_url && (
        <a
          href={d.source_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-cyan-300 hover:underline"
        >
          Source ↗
        </a>
      )}

      {(!d.ingredients?.length && !d.steps?.length) && (
        <p className="text-gray-500">Cette recette n&apos;a ni ingrédients ni étapes renseignés.</p>
      )}
    </div>
  )
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
  const [showFull, setShowFull] = useState(false)

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
              <p>
                <span className="text-gray-400">Signalé par :</span>{' '}
                {report.reporter_name ?? (
                  <span className="font-mono text-[0.7rem] text-gray-500">{report.reported_by}</span>
                )}
              </p>
              <p><span className="text-gray-400">Motif :</span> {report.reason}</p>
              {report.details && <p><span className="text-gray-400">Détails :</span> {report.details}</p>}
            </div>
          </div>

          {/* Voir la recette complète (pour juger) */}
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => setShowFull((v) => !v)}>
              {showFull ? 'Masquer la recette complète' : 'Voir la recette complète'}
            </Button>
            {showFull && <RecipeFullView recipeId={report.recipe_id} />}
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
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                  : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openBan()}>
            <UserX className="mr-1.5 h-3.5 w-3.5" />
            Bannir un utilisateur
          </Button>
          <Button variant="ghost" size="sm" disabled={isFetching} onClick={() => refetch()}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-center">
          <p className="text-sm text-red-400">Impossible de charger les signalements</p>
          <p className="text-xs text-gray-500 mt-1">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2.5">
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-300">
            Aucun signalement{filter !== 'all' ? ' dans ce statut' : ''}.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {filter === 'pending' ? 'Rien à modérer pour le moment — tout est propre.' : 'Change de filtre pour voir les autres signalements.'}
          </p>
        </div>
      ) : (
        <>
          {/* Table — desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Recette</th>
                  <th className="px-4 py-2.5 font-medium">Motif</th>
                  <th className="px-4 py-2.5 font-medium">Détails</th>
                  <th className="px-4 py-2.5 font-medium">Statut</th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 align-top transition-colors last:border-0 hover:bg-cyan-400/[0.04]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-400">{fmtDate(r.created_at)}</td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-gray-200">
                      {r.recipe?.name ?? <span className="font-mono text-xs text-gray-500">{r.recipe_id}</span>}
                    </td>
                    <td className="px-4 py-3 text-white">{r.reason}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-400">{r.details ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_BADGE[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setActive(r)}>
                        Traiter
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {data.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={STATUS_BADGE[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                  <span className="text-xs text-gray-500">{fmtDate(r.created_at)}</span>
                </div>
                <p className="text-sm text-gray-200">
                  {r.recipe?.name ?? <span className="font-mono text-xs text-gray-500">{r.recipe_id}</span>}
                </p>
                <p className="text-sm text-white">
                  <span className="text-gray-400">Motif : </span>
                  {r.reason}
                </p>
                {r.details && <p className="text-xs text-gray-400">{r.details}</p>}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setActive(r)}>
                  Traiter
                </Button>
              </div>
            ))}
          </div>
        </>
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
