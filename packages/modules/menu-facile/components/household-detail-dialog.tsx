'use client'

import { useState } from 'react'
import {
  Users,
  CalendarDays,
  Flag,
  Crown,
  Ban,
  BadgeCheck,
  AlertTriangle,
  Loader2,
  Mail,
  EyeOff,
  Check,
  Undo2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  toast,
} from '@monprojetpro/ui'
import { useHousehold } from '../hooks/use-households'
import { useModerationActions } from '../hooks/use-moderation'
import { num, shortDate, fullDate, relativeDate } from '../utils/format'
import type { HouseholdMember, HouseholdPlanning, MenuFacileReport } from '../types'

/**
 * Bouton d'action lourde à confirmation en deux temps : le premier clic
 * transforme le bouton en « Confirmer ? », le second exécute. Évite le
 * bannissement au clic accidentel sans imposer une modale par-dessus la fiche.
 */
function ConfirmButton({
  label,
  confirmLabel,
  icon: Icon,
  tone = 'neutral',
  busy,
  onConfirm,
}: {
  label: string
  confirmLabel: string
  icon: typeof Ban
  tone?: 'neutral' | 'danger'
  busy?: boolean
  onConfirm: () => void
}) {
  const [armed, setArmed] = useState(false)

  const base =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50'
  const style = armed
    ? tone === 'danger'
      ? 'border-red-400/50 bg-red-400/20 text-red-100'
      : 'border-cyan-400/50 bg-cyan-400/20 text-cyan-100'
    : tone === 'danger'
      ? 'border-white/10 text-gray-400 hover:border-red-400/40 hover:text-red-300'
      : 'border-white/10 text-gray-400 hover:border-cyan-400/40 hover:text-cyan-200'

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (armed) {
          onConfirm()
          setArmed(false)
        } else {
          setArmed(true)
        }
      }}
      onBlur={() => setArmed(false)}
      className={`${base} ${style}`}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
      {armed ? confirmLabel : label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Sous-blocs
// ---------------------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Users
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
        <Icon className="h-3.5 w-3.5 text-cyan-400/70" />
        {title}
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[0.65rem] tabular-nums text-gray-400">
            {count}
          </span>
        )}
      </h3>
      {children}
    </section>
  )
}

/**
 * Section absente du guichet : on le dit explicitement plutôt que d'afficher
 * une liste vide, qui ferait croire à tort que le foyer n'a rien.
 */
function NotProvided({ what }: { what: string }) {
  return (
    <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs text-gray-500">
      {what} — donnée non fournie par le guichet MenuFacile.
    </p>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs text-gray-500">
      {children}
    </p>
  )
}

function MemberRow({
  m,
  householdName,
  onBan,
  busy,
}: {
  m: HouseholdMember
  householdName: string
  onBan: (member: HouseholdMember) => void
  busy: boolean
}) {
  const name = m.display_name?.trim() || m.email || 'Membre sans nom'

  // Message pré-rempli : MiKL n'a plus qu'à écrire le corps.
  const mailto = m.email
    ? `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(
        `MenuFacile — foyer ${householdName}`,
      )}`
    : null

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm text-white">
            {name}
            {m.role === 'owner' && (
              <span title="Créateur du foyer">
                <Crown className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              </span>
            )}
            {m.is_banned && (
              <span className="inline-flex items-center gap-1 rounded border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-[0.65rem] text-red-300">
                <Ban className="h-3 w-3" />
                Banni
              </span>
            )}
          </p>
          {m.display_name && m.email && (
            <p className="truncate text-xs text-gray-500">{m.email}</p>
          )}
        </div>
        <div className="text-right text-xs">
          <p className="text-gray-300" title={fullDate(m.last_sign_in_at)}>
            Vu {relativeDate(m.last_sign_in_at)}
          </p>
          <p className="text-gray-500">Membre depuis le {shortDate(m.joined_at)}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {mailto && (
          <a
            href={mailto}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 px-2 py-1 text-xs text-gray-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
          >
            <Mail className="h-3 w-3" />
            Écrire
          </a>
        )}
        <ConfirmButton
          label={m.is_banned ? 'Débannir' : 'Bannir'}
          confirmLabel={m.is_banned ? 'Confirmer le déban ?' : 'Confirmer le ban ?'}
          icon={m.is_banned ? Undo2 : Ban}
          tone={m.is_banned ? 'neutral' : 'danger'}
          busy={busy}
          onConfirm={() => onBan(m)}
        />
      </div>
    </div>
  )
}

/** Semaine de planning. `week_start` est une date nue (YYYY-MM-DD). */
function PlanningRow({ p }: { p: HouseholdPlanning }) {
  const start = new Date(`${p.week_start}T00:00:00`)
  const label = Number.isNaN(start.getTime())
    ? p.week_start
    : start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <span className="text-sm text-gray-200">Semaine du {label}</span>
      <span className="whitespace-nowrap text-xs tabular-nums text-gray-400">
        {num(p.meals_filled)} repas
      </span>
    </div>
  )
}

function ReportRow({
  r,
  actionable,
  onHide,
  onResolve,
  busy,
}: {
  r: MenuFacileReport
  /** Les actions ne s'affichent que sur les signalements VISANT ce foyer. */
  actionable: boolean
  onHide: (r: MenuFacileReport) => void
  onResolve: (r: MenuFacileReport) => void
  busy: boolean
}) {
  const pending = r.status === 'pending'
  const alreadyHidden = r.recipe?.is_hidden === true

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm text-gray-200">
            {r.recipe?.name ?? `Recette ${r.recipe_id.slice(0, 8)}…`}
          </p>
          <p className="truncate text-xs text-gray-500">{r.reason}</p>
        </div>
        <span
          className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.65rem] ${
            pending
              ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
              : 'border-white/10 text-gray-400'
          }`}
        >
          {pending ? 'En attente' : 'Traité'}
        </span>
      </div>

      {actionable && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ConfirmButton
            label={alreadyHidden ? 'Réafficher la recette' : 'Masquer la recette'}
            confirmLabel="Confirmer ?"
            icon={alreadyHidden ? Undo2 : EyeOff}
            tone={alreadyHidden ? 'neutral' : 'danger'}
            busy={busy}
            onConfirm={() => onHide(r)}
          />
          {pending && (
            <ConfirmButton
              label="Marquer traité"
              confirmLabel="Confirmer ?"
              icon={Check}
              busy={busy}
              onConfirm={() => onResolve(r)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fiche foyer
// ---------------------------------------------------------------------------

export function HouseholdDetailDialog({
  householdId,
  onClose,
}: {
  householdId: string | null
  onClose: () => void
}) {
  const { data, isLoading, error } = useHousehold(householdId)
  const { hide, ban, resolve } = useModerationActions()

  const emitted = data?.reports?.emitted ?? []
  const received = data?.reports?.received ?? []
  const busy = hide.isPending || ban.isPending || resolve.isPending

  const onBan = (m: HouseholdMember) => {
    const label = m.display_name?.trim() || m.email || 'ce membre'
    ban.mutate(
      // `until: null` lève le ban ; une date ISO le pose. Pas de durée choisie
      // ici : on bannit sans échéance, la levée se fait par le même bouton.
      { userId: m.id, until: m.is_banned ? null : new Date(2099, 0, 1).toISOString() },
      {
        onSuccess: () =>
          toast.success(m.is_banned ? `${label} est débanni` : `${label} est banni`),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  const onHide = (r: MenuFacileReport) => {
    const hidden = !(r.recipe?.is_hidden === true)
    hide.mutate(
      { recipeId: r.recipe_id, hidden },
      {
        onSuccess: () => toast.success(hidden ? 'Recette masquée' : 'Recette réaffichée'),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  const onResolve = (r: MenuFacileReport) => {
    resolve.mutate(
      { reportId: r.id, status: 'reviewed' },
      {
        onSuccess: () => toast.success('Signalement marqué comme traité'),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Dialog open={!!householdId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {data?.name ?? 'Foyer'}
            {data?.is_official && (
              <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-cyan-300">
                <BadgeCheck className="h-3 w-3" />
                Officiel
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de la fiche…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(error as Error).message}</span>
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-6">
            {/* Résumé chiffré */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Membres', num(data.members_count)],
                ['Recettes', num(data.recipes_count)],
                ['Repas planifiés', num(data.planned_meals_count)],
                ['Amitiés', num(data.friendships_count)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-lg font-semibold tabular-nums text-white">{value}</p>
                  <p className="text-[0.7rem] text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Créé le {shortDate(data.created_at)} · dernière activité{' '}
              <span title={fullDate(data.last_activity_at)}>
                {relativeDate(data.last_activity_at)}
              </span>
            </p>

            {/* Membres */}
            <Section icon={Users} title="Membres" count={data.members?.length}>
              {!data.members ? (
                <NotProvided what="Membres" />
              ) : data.members.length === 0 ? (
                <EmptyLine>Aucun membre rattaché à ce foyer.</EmptyLine>
              ) : (
                <div className="space-y-2">
                  {data.members.map((m) => (
                    <MemberRow
                      key={m.id}
                      m={m}
                      householdName={data.name}
                      onBan={onBan}
                      busy={busy}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* Plannings */}
            <Section
              icon={CalendarDays}
              title="Derniers plannings"
              count={data.recent_plannings?.length}
            >
              {!data.recent_plannings ? (
                <NotProvided what="Plannings" />
              ) : data.recent_plannings.length === 0 ? (
                <EmptyLine>Ce foyer n’a encore planifié aucune semaine.</EmptyLine>
              ) : (
                <div className="space-y-2">
                  {data.recent_plannings.map((p) => (
                    <PlanningRow key={p.week_start} p={p} />
                  ))}
                </div>
              )}
            </Section>

            {/* Signalements */}
            <Section icon={Flag} title="Signalements" count={emitted.length + received.length}>
              {!data.reports ? (
                <NotProvided what="Signalements" />
              ) : emitted.length + received.length === 0 ? (
                <EmptyLine>Aucun signalement lié à ce foyer.</EmptyLine>
              ) : (
                <div className="space-y-3">
                  {received.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Visant une recette du foyer ({received.length})
                      </p>
                      {received.map((r) => (
                        <ReportRow
                          key={r.id}
                          r={r}
                          actionable
                          onHide={onHide}
                          onResolve={onResolve}
                          busy={busy}
                        />
                      ))}
                    </div>
                  )}
                  {emitted.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Émis par un membre du foyer ({emitted.length})
                      </p>
                      {emitted.map((r) => (
                        <ReportRow
                          key={r.id}
                          r={r}
                          actionable={false}
                          onHide={onHide}
                          onResolve={onResolve}
                          busy={busy}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
